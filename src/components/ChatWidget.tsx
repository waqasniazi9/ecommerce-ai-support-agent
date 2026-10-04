"use client";

import { FormEvent, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const initialMessage: Message = {
  role: "assistant",
  content:
    "Hi! I’m Nexa Support. I can help with shipping, returns, order status, and refund requests.",
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();

    if (!message || isLoading) {
      return;
    }

    const history = messages.map((item) => ({
      role: item.role,
      content: item.content,
    }));

    const userMessage: Message = {
      role: "user",
      content: message,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.reply || "The support service could not process the request."
        );
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: data.reply || "Sorry, I could not generate a reply.",
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Sorry, failed to connect to the support service.";

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: `Sorry — ${errorMessage}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <section className="mb-4 flex h-[520px] w-[min(384px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-indigo-600 px-5 py-4 text-white">
            <div>
              <h2 className="font-semibold">Nexa Support</h2>
              <p className="mt-1 text-xs text-indigo-100">
                Orders, returns, shipping, and refunds
              </p>
            </div>

            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setIsOpen(false)}
              className="rounded-md px-2 py-1 text-xl text-white hover:bg-white/10"
            >
              ×
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`flex ${
                  item.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <p
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    item.role === "user"
                      ? "rounded-br-sm bg-indigo-100 text-indigo-950"
                      : "rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                  }`}
                >
                  {item.content}
                </p>
              </div>
            ))}

            {isLoading && (
              <p className="text-sm italic text-slate-500">
                Nexa is typing...
              </p>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex gap-2 border-t border-slate-200 bg-white p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isLoading}
              placeholder="Type your message..."
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
            />

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-label="Open Nexa Support chat"
        onClick={() => setIsOpen((open) => !open)}
        className="grid h-14 w-14 place-items-center rounded-full bg-indigo-600 text-2xl text-white shadow-lg transition hover:scale-105 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
      >
        💬
      </button>
    </div>
  );
}