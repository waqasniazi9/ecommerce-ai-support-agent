import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createRefundTicket, getOrderById } from "@/lib/google-sheets";

export const runtime = "nodejs";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

const SYSTEM_PROMPT = `
You are Nexa Support, a helpful AI customer-support assistant for Nexa Store.

Store policies:
- Returns are accepted within 30 days of delivery if items are unused and in their original condition.
- Standard shipping normally takes 3 to 7 business days.
- Refunds normally take 5 to 10 business days after approval.
- A refund request requires an order ID and a clear reason.

Rules:
- Use lookup_order for questions about a specific order's status, item, amount, shipping, delivery, or cancellation.
- Use create_refund_ticket only when the customer provides a valid order ID and a clear reason.
- Never invent order details, ticket IDs, refunds, delivery information, or order status.
- If an order is not found, politely ask the customer to verify the order ID.
- If an order ID or refund reason is missing, ask for the missing detail.
- If you do not know the answer, say so honestly.
- Be concise, friendly, and professional.
`;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "lookup_order",
      description: "Look up an e-commerce order in Google Sheets by order ID.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "The order ID, for example ORD-1001.",
          },
        },
        required: ["order_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_refund_ticket",
      description:
        "Create a refund ticket in Google Sheets after the customer provides a valid order ID and a clear reason.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "The order ID associated with the refund.",
          },
          reason: {
            type: "string",
            description: "The customer's reason for requesting a refund.",
          },
        },
        required: ["order_id", "reason"],
        additionalProperties: false,
      },
    },
  },
];

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          reply:
            "Server setup error: OPENAI_API_KEY is missing in .env.local.",
        },
        { status: 500 }
      );
    }

    const body: unknown = await request.json();
    const { message, history } = requestSchema.parse(body);

    const openai = new OpenAI({ apiKey });

    const conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...history,
      {
        role: "user",
        content: message,
      },
    ];

    let completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversation,
      tools,
      tool_choice: "auto",
      temperature: 0.2,
    });

    let assistantMessage = completion.choices[0].message;

    while (assistantMessage.tool_calls?.length) {
      conversation.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== "function") {
          continue;
        }

        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        let toolResult: unknown;

        if (toolName === "lookup_order") {
          const order = await getOrderById(toolArgs.order_id);

          toolResult = order
            ? { found: true, order }
            : {
              found: false,
              message: `No order was found with ID ${toolArgs.order_id}.`,
            };
        } else if (toolName === "create_refund_ticket") {
          const order = await getOrderById(toolArgs.order_id);

          toolResult = order
            ? {
              success: true,
              ticket: await createRefundTicket(
                toolArgs.order_id,
                toolArgs.reason
              ),
            }
            : {
              success: false,
              message: `Order ${toolArgs.order_id} was not found, so no refund ticket was created.`,
            };
        } else {
          toolResult = {
            success: false,
            message: `Unknown tool requested: ${toolName}`,
          };
        }

        conversation.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: conversation,
        tools,
        tool_choice: "auto",
        temperature: 0.2,
      });

      assistantMessage = completion.choices[0].message;
    }

    return NextResponse.json({
      reply:
        assistantMessage.content?.trim() ||
        "Sorry, I could not generate a response.",
    });
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { reply: "Please send a message between 1 and 1,000 characters." },
        { status: 400 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json(
      { reply: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}