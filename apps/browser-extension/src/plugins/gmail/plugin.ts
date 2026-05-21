import type { ContentBundle } from "@pyla/core-schema";
import { createAppError } from "@pyla/core-schema";
import type { Plugin, PluginContext } from "@pyla/core-plugins";
import { generateId } from "@pyla/core-plugins";

const HOST_PATTERN = /^https:\/\/mail\.google\.com\//i;

export const gmailPlugin: Plugin = {
  id: "gmail",
  version: "1.0.0",
  name: "Gmail",

  urls: {
    hosts: ["https://mail.google.com/*"],
    match: (url) => HOST_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    if (!this.urls.match(ctx.url)) {
      throw createAppError("E-PARSE-001", "Not a Gmail page");
    }

    // Gmail threads usually have multiple messages expanded or collapsed.
    // .h7 usually represents a message block.
    // .gD contains the sender name.
    // .a3s contains the actual message body.
    // .hP contains the subject line.
    
    const subjectElement = document.querySelector(".hP");
    const title = subjectElement?.textContent?.trim() || "Gmail Thread";

    const messageNodes = Array.from(document.querySelectorAll(".h7"));
    if (messageNodes.length === 0) {
      throw createAppError(
        "E-PARSE-005",
        "No email messages found on this page. Please open a thread."
      );
    }

    const contentNodes: ContentBundle["nodes"] = [];
    let order = 0;

    for (const node of messageNodes) {
      const senderElement = node.querySelector(".gD");
      const senderName = senderElement?.textContent?.trim() || "Sender";
      const senderEmail = senderElement?.getAttribute("email") || senderName;

      const bodyElement = node.querySelector(".a3s");
      if (!bodyElement) continue;

      let text = bodyElement.textContent?.trim() || "";
      if (!text) continue;

      contentNodes.push({
        id: generateId(),
        participantId: senderEmail,
        content: text,
        order: order++,
        type: "message",
      });
    }

    if (contentNodes.length === 0) {
      throw createAppError(
        "E-PARSE-005",
        "Could not extract any content from the email messages."
      );
    }

    // Extract unique participants
    const participantsMap = new Map<string, { id: string; name: string; role: "user" | "assistant" }>();
    for (const node of contentNodes) {
      if (!participantsMap.has(node.participantId)) {
        participantsMap.set(node.participantId, {
          id: node.participantId,
          name: node.participantId,
          role: "assistant", // Default all senders to assistant or user
        });
      }
    }

    return {
      id: generateId(),
      title,
      participants: Array.from(participantsMap.values()),
      nodes: contentNodes,
      source: {
        platform: "gmail",
        url: ctx.url,
        extractedAt: new Date().toISOString(),
        pluginId: "gmail",
        pluginVersion: "1.0.0",
      },
    };
  },

  theme: {
    light: {
      primary: "#ea4335",
      secondary: "#fbbc04",
      fg: "#ffffff",
      secondaryFg: "#ffffff",
    },
    dark: {
      primary: "#ea4335",
      secondary: "#fbbc04",
      fg: "#ffffff",
      secondaryFg: "#ffffff",
    },
  },
};
