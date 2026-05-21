import type { ClaudeMessage } from "./types";

function normalizeArtifactToCodeBlock(text: string): string {
  const artifactRegex = /<antArtifact\s+([^>]+)>([\s\S]*?)<\/antArtifact>/gi;

  return text.replace(artifactRegex, (_fullMatch, attributes, body) => {
    const attributeText = typeof attributes === "string" ? attributes : "";
    const languageMatch = /language="([^"]+)"/i.exec(attributeText);
    const language = languageMatch?.[1] ?? "plaintext";
    const code = typeof body === "string" ? body.trim() : "";

    return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
  });
}

export function extractClaudeMessageText(message: ClaudeMessage): string {
  const contentText = Array.isArray(message.content)
    ? message.content
        .filter((item) => item.type === "text" && Boolean(item.text))
        .map((item) => item.text?.trim() ?? "")
        .filter(Boolean)
        .join("\n")
    : "";

  const fallbackText = message.text?.trim() ?? "";
  const merged = (contentText || fallbackText).trim();

  if (!merged) {
    return "";
  }

  return normalizeArtifactToCodeBlock(merged);
}
