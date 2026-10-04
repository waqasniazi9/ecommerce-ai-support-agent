import { google } from "googleapis";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

function getSpreadsheetId() {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
        throw new Error("GOOGLE_SHEET_ID is not configured.");
    }

    return spreadsheetId;
}

function getGoogleAuth() {
    const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    // Production / Vercel: JSON is stored as a protected environment variable.
    if (rawCredentials) {
        const credentials = JSON.parse(rawCredentials);

        return new google.auth.GoogleAuth({
            credentials,
            scopes: SHEETS_SCOPE,
        });
    }

    // Local development only: use a credential file ignored by Git.
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (keyFile) {
        return new google.auth.GoogleAuth({
            keyFile,
            scopes: SHEETS_SCOPE,
        });
    }

    throw new Error(
        "Google credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON on Vercel, or GOOGLE_APPLICATION_CREDENTIALS locally."
    );
}

export async function getSheetsClient() {
    getSpreadsheetId();

    const auth = getGoogleAuth();

    return google.sheets({
        version: "v4",
        auth,
    });
}

export function getConfiguredSpreadsheetId() {
    return getSpreadsheetId();
}