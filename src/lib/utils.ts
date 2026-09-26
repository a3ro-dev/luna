import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safe error logger that avoids leaking sensitive details in production.
 * In development: logs the full error object.
 * In production: logs only the error message.
 */
export function logError(context: string, error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}]`, error);
  } else {
    let message = error instanceof Error ? error.message : "Unknown error";
    if (message.startsWith("Failed query:")) {
      // DrizzleQueryError embeds bound params (health data, emails, hashes). Keep the SQL, drop the params.
      const cause = (error as { cause?: { name?: string; code?: string } }).cause;
      message = `${message.split("\nparams:")[0]} (cause: ${cause?.code ?? cause?.name ?? "unknown"})`;
    }
    console.error(`[${context}] ${message}`);
  }
}
