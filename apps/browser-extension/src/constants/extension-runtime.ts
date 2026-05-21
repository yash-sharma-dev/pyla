import { getAllPlugins } from "@pyla/core-plugins";

export const PYLA_COMPONENT_NAME = "pyla-root";

export const EXTENSION_RUNTIME_MESSAGE = {
  COPY_CURRENT: "pyla:copy-current",
  SIGN_IN_GOOGLE: "pyla:sign-in-google",
} as const;

export const EXTENSION_WINDOW_EVENT = {
  URL_CHANGE: "pyla:url-change",
  COPY_CURRENT: "pyla:copy-current-window",
  COPY_SUCCESS: "pyla:copy-success",
  COPY_ERROR: "pyla:copy-error",
} as const;

export type ExtensionRuntimeMessageType =
  (typeof EXTENSION_RUNTIME_MESSAGE)[keyof typeof EXTENSION_RUNTIME_MESSAGE];

export function isSupportedTabUrl(url?: string): boolean {
  if (!url) return false;
  return getAllPlugins().some((p) => p.urls.match(url));
}
