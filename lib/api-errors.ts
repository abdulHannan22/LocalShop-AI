// Shared helpers for consistent, user-facing API error responses.
// Internal details (stack traces, SQL, connection strings) are logged but
// never sent to the client.

type PrismaErrorInfo = { code?: string; message?: string };

function prismaErrorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as PrismaErrorInfo).code;
    if (typeof code === "string" && code.startsWith("P")) return code;
  }
  return null;
}

function prismaErrorMessage(error: unknown): string | null {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as PrismaErrorInfo).message;
    if (typeof message === "string") return message;
  }
  return null;
}

/**
 * Maps a known database failure to a message the user can act on.
 * Returns null for unknown errors (caller supplies a generic fallback).
 */
export function userMessageForError(error: unknown): string | null {
  const code = prismaErrorCode(error);
  if (code === "P1001" || code === "P1002") {
    return "The service is temporarily unable to reach its database. Please try again in a few moments.";
  }
  if (code === "P1003") {
    return "The database is not configured correctly. Please contact support if this persists.";
  }
  if (code === "P2002") {
    return "That record already exists. Please review your details and try again.";
  }
  if (code === "P2025") {
    return "The requested record no longer exists. Please refresh and try again.";
  }
  const message = prismaErrorMessage(error);
  if (message && message.includes("Timed out fetching a new connection")) {
    return "The service is under heavy load right now. Please try again shortly.";
  }
  return null;
}

/**
 * Logs the full error server-side and returns a Response with a safe,
 * user-friendly message. In development the raw message is also included
 * as `debug` to speed up local troubleshooting.
 */
export function errorResponse(
  error: unknown,
  context: "recommend" | "checkout" | "webhook" | string,
  fallbackMessage = "Something went wrong on our side. Please try again in a few moments.",
): Response {
  console.error(`[${context}]`, error);
  const isProd = process.env.NODE_ENV === "production";
  const friendly = userMessageForError(error) ?? fallbackMessage;
  const debug = isProd
    ? undefined
    : error instanceof Error
      ? error.message
      : String(error);
  return Response.json(
    { error: friendly, ...(debug ? { debug } : {}) },
    { status: 503 },
  );
}
