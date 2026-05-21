import type { MessageContent } from "../types";
import { codeFlattener } from "./code-flattener";
import { fallbackFlattener } from "./fallback-flattener";
import { modelEditableContextFlattener } from "./model-editable-context-flattener";
import { multimodalTextFlattener } from "./multimodal-text-flattener";
import { reasoningRecapFlattener } from "./reasoning-recap-flattener";
import { textFlattener } from "./text-flattener";
import { thoughtsFlattener } from "./thoughts-flattener";
import { toolResponseFlattener } from "./tool-response-flattener";
import type {
  ContentFlattener,
  ContentFlattenerRegistry,
  FlattenContext,
} from "./types";

export type { ContentFlattener, ContentFlattenerRegistry, FlattenContext };

const registry: ContentFlattenerRegistry = new Map();

export function registerContentFlattener(flattener: ContentFlattener): void {
  registry.set(flattener.contentType, flattener);
}

registerContentFlattener(textFlattener);
registerContentFlattener(codeFlattener);
registerContentFlattener(thoughtsFlattener);
registerContentFlattener(reasoningRecapFlattener);
registerContentFlattener(multimodalTextFlattener);
registerContentFlattener(toolResponseFlattener);
registerContentFlattener(modelEditableContextFlattener);

export async function flattenMessageContent(
  content: MessageContent,
  context?: FlattenContext,
): Promise<string> {
  const contentType = content.content_type;

  if (contentType) {
    const flattener = registry.get(contentType);
    if (flattener?.canHandle(content)) {
      return flattener.flatten(content, context);
    }
  }

  return fallbackFlattener.flatten(content, context);
}
