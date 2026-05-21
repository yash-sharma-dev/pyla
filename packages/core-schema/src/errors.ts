import { z } from "zod";

export const ParseErrorCode = z.enum([
  "E-PARSE-001", // Adapter not found
  "E-PARSE-002", // DOM structure changed
  "E-PARSE-005", // No messages found
  "E-PARSE-006", // Invalid input format
  "E-PARSE-007", // Rate limited
]);
export type ParseErrorCode = z.infer<typeof ParseErrorCode>;

export const BundleErrorCode = z.enum([
  "E-BUNDLE-001", // Serialization failed
  "E-BUNDLE-002", // Clipboard write failed
  "E-BUNDLE-003", // Partial batch failure
]);
export type BundleErrorCode = z.infer<typeof BundleErrorCode>;

export const ErrorCode = z.union([ParseErrorCode, BundleErrorCode]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const AppError = z
  .object({
    code: ErrorCode,
    message: z.string(),
    detail: z.string().optional(),
    timestamp: z.string().datetime(),
  })
  .strict();
export type AppError = z.infer<typeof AppError>;

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  "E-PARSE-001": "Cannot find a plugin for this page",
  "E-PARSE-002": "Page structure has changed, plugin needs update",
  "E-PARSE-005": "No content found",
  "E-PARSE-006": "Invalid input format",
  "E-PARSE-007": "Rate limited, please try again later",
  "E-BUNDLE-001": "Failed to serialize content to Markdown",
  "E-BUNDLE-002": "Failed to write to clipboard",
  "E-BUNDLE-003": "Some items failed to copy",
};

export function createAppError(code: ErrorCode, detail?: string): AppError {
  return AppError.parse({
    code,
    message: ERROR_MESSAGES[code],
    detail,
    timestamp: new Date().toISOString(),
  });
}

export function isParseError(error: AppError): boolean {
  return error.code.startsWith("E-PARSE");
}

export function isBundleError(error: AppError): boolean {
  return error.code.startsWith("E-BUNDLE");
}
