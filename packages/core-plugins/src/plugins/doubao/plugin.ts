import type { ContentBundle } from "@pyla/core-schema";
import { createAppError } from "@pyla/core-schema";
import type { Plugin, PluginContext } from "../../types";
import { generateId } from "../../utils";
import { createChatInjector } from "../shared/chat-injector";
import type {
  DoubaoChainResponse,
  DoubaoConversationInfoResponse,
  DoubaoMessage,
} from "./types";

const HOST_PATTERN = /^https:\/\/www\.doubao\.com\//i;
const CONVERSATION_PATTERN =
  /^https?:\/\/www\.doubao\.com\/chat\/([a-zA-Z0-9_-]+)(?:[/?#]|$)/;

const API_BASE = "https://www.doubao.com";
const API_PARAMS =
  "version_code=20800&language=zh&device_platform=web&aid=497858&real_aid=497858&pkg_type=release_version&samantha_web=1&use-olympus-account=1";

const FETCH_LIMIT = 20;
const MAX_PAGINATION_PAGES = 100;

export const doubaoPlugin: Plugin = {
  id: "doubao",
  version: "1.0.0",
  name: "豆包",

  urls: {
    hosts: ["https://www.doubao.com/*"],
    match: (url) => HOST_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    const conversationId = extractConversationId(ctx.url);
    if (!conversationId)
      throw createAppError("E-PARSE-001", "Not a Doubao conversation page");

    return fetchAndParse(conversationId, ctx.url);
  },

  async fetchById(conversationId: string): Promise<ContentBundle> {
    const url = `https://www.doubao.com/chat/${conversationId}`;
    return fetchAndParse(conversationId, url);
  },

  injector: createChatInjector({
    platform: "doubao",
    copyButtonSelectors: [
      // Right-aligned container in the header row (next to share button)
      'main div[class*="header-height"] > .justify-end',
    ],
    copyButtonPosition: "prepend",
    listItemLinkSelector: 'nav a[href^="/chat/"]',
    listItemIdPattern: /\/chat\/([a-zA-Z0-9_-]+)(?:[/?#]|$)/,
    mainContentSelector: "main",
    sidebarSelector: "nav",
  }),

  theme: {
    light: {
      primary: "#4e6ef2",
      secondary: "#eef1ff",
      fg: "#ffffff",
      secondaryFg: "#6366f1",
    },
    dark: {
      primary: "#4e6ef2",
      secondary: "#1a1a2e",
      fg: "#ffffff",
      secondaryFg: "#a5b4fc",
    },
  },
};

// --- Internal helpers ---

function extractConversationId(url: string): string | null {
  const match = CONVERSATION_PATTERN.exec(url);
  return match?.[1] ?? null;
}

async function fetchAndParse(
  conversationId: string,
  url: string,
): Promise<ContentBundle> {
  const [title, messages] = await Promise.all([
    fetchConversationTitle(conversationId),
    fetchAllMessages(conversationId),
  ]);

  return parseConversation(messages, title, url);
}

// --- API: Conversation info ---

async function fetchConversationTitle(
  conversationId: string,
): Promise<string | undefined> {
  try {
    const response = await fetch(
      `${API_BASE}/im/conversation/info?${API_PARAMS}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; encoding=utf-8",
          Accept: "application/json, text/plain, */*",
          "agw-js-conv": "str",
        },
        credentials: "include",
        body: JSON.stringify({
          cmd: 1110,
          uplink_body: {
            get_conv_info_uplink_body: {
              conversation_id: conversationId,
              ext: {},
              bot_id: "",
              conversation_type: 3,
              option: { need_bot_info: false },
            },
          },
          sequence_id: crypto.randomUUID(),
          channel: 2,
          version: "1",
        }),
      },
    );

    if (!response.ok) return undefined;

    const data = (await response.json()) as DoubaoConversationInfoResponse;
    return data.downlink_body?.get_conv_info_downlink_body?.conversation_info
      ?.name;
  } catch {
    return undefined;
  }
}

// --- API: Fetch all messages with pagination ---

async function fetchAllMessages(
  conversationId: string,
): Promise<DoubaoMessage[]> {
  const allMessages: DoubaoMessage[] = [];
  let anchorIndex = Number.MAX_SAFE_INTEGER;
  let hasMore = true;

  for (let page = 0; page < MAX_PAGINATION_PAGES && hasMore; page++) {
    const response = await fetch(`${API_BASE}/im/chain/single?${API_PARAMS}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; encoding=utf-8",
        Accept: "application/json, text/plain, */*",
        "agw-js-conv": "str",
      },
      credentials: "include",
      body: JSON.stringify({
        cmd: 3100,
        uplink_body: {
          pull_singe_chain_uplink_body: {
            conversation_id: conversationId,
            anchor_index: anchorIndex,
            conversation_type: 3,
            direction: 1,
            limit: FETCH_LIMIT,
            ext: {},
            filter: { index_list: [] },
          },
        },
        sequence_id: crypto.randomUUID(),
        channel: 2,
        version: "1",
      }),
    });

    if (!response.ok) {
      throw createAppError(
        "E-PARSE-005",
        `Doubao API responded with ${response.status}`,
      );
    }

    const data = (await response.json()) as DoubaoChainResponse;
    const messages =
      data.downlink_body?.pull_singe_chain_downlink_body?.messages ?? [];

    if (messages.length === 0) break;

    allMessages.push(...messages);

    // Find smallest index_in_conv for next pagination anchor
    const indices = messages
      .map((m) => Number.parseInt(m.index_in_conv, 10))
      .filter((n) => !Number.isNaN(n));
    if (indices.length === 0) break;

    const minIndex = Math.min(...indices);
    if (minIndex >= anchorIndex) break; // no progress — avoid infinite loop
    anchorIndex = minIndex;

    hasMore =
      data.downlink_body?.pull_singe_chain_downlink_body?.has_more !== false &&
      messages.length >= FETCH_LIMIT;
  }

  return allMessages;
}

// --- Parse conversation into ContentBundle ---

function extractMessageText(message: DoubaoMessage): string {
  // Primary: content_block text (assistant messages)
  if (message.content_block?.length) {
    const texts = message.content_block.flatMap((block) => {
      const text = block.content?.text_block?.text;
      return text ? [text] : [];
    });
    if (texts.length > 0) return texts.join("\n\n");
  }
  // Fallback: top-level content field (user messages are JSON-encoded: {"text":"..."})
  if (message.content?.trim()) {
    const raw = message.content.trim();
    try {
      const parsed = JSON.parse(raw) as { text?: string };
      if (parsed.text) return parsed.text;
    } catch {
      // Not JSON — use raw content
    }
    return raw;
  }
  return "";
}

function parseConversation(
  messages: DoubaoMessage[],
  title: string | undefined,
  url: string,
): ContentBundle {
  // Sort by index_in_conv ascending (chronological)
  const sorted = [...messages].sort(
    (a, b) =>
      Number.parseInt(a.index_in_conv, 10) -
      Number.parseInt(b.index_in_conv, 10),
  );

  // Group consecutive same-role messages
  interface GroupedMessage {
    role: "user" | "assistant";
    text: string;
  }

  const grouped: GroupedMessage[] = [];
  for (const message of sorted) {
    const role = message.user_type === 1 ? "user" : "assistant";
    const text = extractMessageText(message);
    if (!text) continue;

    const last = grouped[grouped.length - 1];
    if (last?.role === role) {
      last.text = `${last.text}\n${text}`.trim();
    } else {
      grouped.push({ role, text });
    }
  }

  if (grouped.length === 0) {
    throw createAppError(
      "E-PARSE-005",
      "No messages found in Doubao conversation",
    );
  }

  const contentNodes: ContentBundle["nodes"] = grouped.map((msg, index) => ({
    id: generateId(),
    participantId: msg.role === "user" ? "user" : "assistant",
    content: msg.text,
    order: index,
    type: "message",
  }));

  return {
    id: generateId(),
    title,
    participants: [
      { id: "user", name: "User", role: "user" },
      { id: "assistant", name: "豆包", role: "assistant" },
    ],
    nodes: contentNodes,
    source: {
      platform: "doubao",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "doubao",
      pluginVersion: "1.0.0",
    },
  };
}
