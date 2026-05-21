import { ContentType } from "../constants";
import { stripPrivateUse } from "../text-processor";
import type { ImageAssetPointer, MessageContent } from "../types";
import type { ContentFlattener, FlattenContext } from "./types";

function isImageAssetPointer(part: unknown): part is ImageAssetPointer {
  return (
    typeof part === "object" &&
    part !== null &&
    (part as Record<string, unknown>).content_type ===
      ContentType.IMAGE_ASSET_POINTER &&
    typeof (part as Record<string, unknown>).asset_pointer === "string"
  );
}

export class MultimodalTextFlattener implements ContentFlattener {
  readonly contentType = ContentType.MULTIMODAL_TEXT;

  canHandle(content: MessageContent): boolean {
    return content.content_type === ContentType.MULTIMODAL_TEXT;
  }

  async flatten(
    content: MessageContent,
    _context?: FlattenContext,
  ): Promise<string> {
    const parts = content.parts ?? [];
    const segments: string[] = [];

    for (const part of parts) {
      if (typeof part === "string") {
        segments.push(stripPrivateUse(part));
        continue;
      }

      if (typeof part === "object" && part !== null) {
        if (isImageAssetPointer(part)) {
          const altText = part.metadata?.dalle?.prompt || "Generated image";
          segments.push(`![${altText}](image)`);
          continue;
        }

        const pType =
          (part as Record<string, unknown>).content_type ??
          (part as Record<string, unknown>).type;

        if (pType === ContentType.TEXT) {
          const texts = (part as Record<string, unknown>).text;
          if (Array.isArray(texts)) {
            segments.push(
              ...texts
                .filter((t): t is string => typeof t === "string")
                .map(stripPrivateUse),
            );
          } else if (typeof texts === "string") {
            segments.push(stripPrivateUse(texts));
          }
        }
      }
    }

    return segments
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n\n");
  }
}

export const multimodalTextFlattener = new MultimodalTextFlattener();
