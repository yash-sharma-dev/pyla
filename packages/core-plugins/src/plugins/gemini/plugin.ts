import type { ContentBundle } from "@pyla/core-schema";
import { createAppError } from "@pyla/core-schema";
import type { Plugin, PluginContext } from "../../types";
import { generateId } from "../../utils";
import { createChatInjector } from "../shared/chat-injector";
import { extractMessagesFromPayload, fetchConversationPayload } from "./parser";
import { extractRuntimeParamsFromHtml, getPreferredLanguage } from "./runtime";
import type { GeminiRuntimeParams } from "./types";

const HOST_PATTERN = /^https:\/\/gemini\.google\.com\//i;
const CONVERSATION_PATTERN =
  /^https?:\/\/gemini\.google\.com\/(?:u\/\d+\/)?app\/([a-zA-Z0-9]+)/;

export const geminiPlugin: Plugin = {
  id: "gemini",
  version: "1.0.0",
  name: "Gemini",

  urls: {
    hosts: ["https://gemini.google.com/*"],
    match: (url) => HOST_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    const conversationId = extractConversationId(ctx.url);
    if (!conversationId) {
      throw createAppError("E-PARSE-001", "Not a Gemini conversation page");
    }

    const pathPrefix = extractPathPrefix(ctx.url);
    const runtimeParams = await resolveRuntimeParams(ctx.document);
    const payload = await fetchConversationPayload(
      conversationId,
      runtimeParams,
      pathPrefix,
    );
    return buildContentBundle(payload, ctx.url);
  },

  async fetchById(conversationId: string): Promise<ContentBundle> {
    const pathPrefix = extractPathPrefix(document.location.href);
    const runtimeParams = await resolveRuntimeParams(document);
    const payload = await fetchConversationPayload(
      conversationId,
      runtimeParams,
      pathPrefix,
    );
    const url = `https://gemini.google.com${pathPrefix}/app/${conversationId}`;
    return buildContentBundle(payload, url);
  },

  injector: createChatInjector({
    platform: "gemini",
    copyButtonSelectors: [
      '.conversation-container',
    ],
    copyButtonPosition: "after",
    listItemLinkSelector: 'a[href*="/app/"]',
    listItemIdPattern: /\/app\/([a-zA-Z0-9]+)$/,
    mainContentSelector: '.conversation-container',
    sidebarSelector: 'nav, div[class*="sidebar"]',
  }),

  theme: {
    light: {
      primary: "#0842a0",
      secondary: "#d3e3fd",
      fg: "#ffffff",
      secondaryFg: "#1d4ed8",
    },
    dark: {
      primary: "#d3e3fd",
      secondary: "#0842a0",
      fg: "#0b1537",
      secondaryFg: "#e0ecff",
    },
  },
};

// --- Internal helpers ---

function extractConversationId(url: string): string | null {
  const match = CONVERSATION_PATTERN.exec(url);
  return match?.[1] ?? null;
}

function extractPathPrefix(url: string): string {
  const match = /^https?:\/\/gemini\.google\.com\/(u\/\d+)\//.exec(url);
  return match ? `/${match[1]}` : "";
}

async function resolveRuntimeParams(
  doc: Document,
): Promise<GeminiRuntimeParams> {
  const hl = getPreferredLanguage(doc);
  const html = doc.documentElement.outerHTML;
  const params = extractRuntimeParamsFromHtml(html, hl);

  if (params) return params;

  // Fallback: re-fetch the page HTML to get fresh tokens
  const response = await fetch(doc.location.href, {
    credentials: "include",
    mode: "cors",
  });
  const remoteHtml = await response.text();
  const fallbackParams = extractRuntimeParamsFromHtml(remoteHtml, hl);

  if (fallbackParams) return fallbackParams;

  throw createAppError(
    "E-PARSE-001",
    "Cannot find Gemini runtime tokens (SNlM0e/cfb2h/FdrFJe)",
  );
}

function buildContentBundle(payload: unknown, url: string): ContentBundle {
  const messages = extractMessagesFromPayload(payload);

  if (messages.length === 0) {
    throw createAppError(
      "E-PARSE-005",
      "No messages found in Gemini conversation",
    );
  }

  // Use the first user message (truncated to 50 chars) as the title
  const firstUserMessage = messages.find((m) => m.role === "user");
  const title = firstUserMessage
    ? firstUserMessage.content.slice(0, 50) +
    (firstUserMessage.content.length > 50 ? "..." : "")
    : undefined;

  const nodes: ContentBundle["nodes"] = messages.map((msg, index) => ({
    id: generateId(),
    participantId: msg.role === "user" ? "user" : "assistant",
    content: msg.content,
    order: index,
    type: "message",
  }));

  return {
    id: generateId(),
    title,
    participants: [
      { id: "user", name: "User", role: "user" },
      { id: "assistant", name: "Gemini", role: "assistant" },
    ],
    nodes,
    source: {
      platform: "gemini",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "gemini",
      pluginVersion: "1.0.0",
    },
  };
}
