import { google } from "googleapis";

const spreadsheetId = process.env.GOOGLE_SHEET_ID;

if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID is missing in .env.local");
}

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({
    version: "v4",
    auth,
});

export type Order = {
    orderId: string;
    customer: string;
    item: string;
    status: string;
    amount: string;
};

export async function getOrderById(orderId: string): Promise<Order | null> {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Orders!A2:E",
    });

    const rows = response.data.values ?? [];

    const matchingRow = rows.find(
        (row) =>
            String(row[0] ?? "").trim().toLowerCase() ===
            orderId.trim().toLowerCase()
    );

    if (!matchingRow) {
        return null;
    }

    return {
        orderId: String(matchingRow[0] ?? ""),
        customer: String(matchingRow[1] ?? ""),
        item: String(matchingRow[2] ?? ""),
        status: String(matchingRow[3] ?? ""),
        amount: String(matchingRow[4] ?? ""),
    };
}

export async function createRefundTicket(orderId: string, reason: string) {
    const ticketId = `TKT-${Date.now().toString().slice(-8)}`;
    const createdAt = new Date().toISOString();

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Tickets!A:D",
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [[ticketId, orderId, reason, createdAt]],
        },
    });

    return {
        ticketId,
        orderId,
        reason,
        createdAt,
    };
}