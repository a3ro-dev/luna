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
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[${context}] ${message}`);
  }
}
