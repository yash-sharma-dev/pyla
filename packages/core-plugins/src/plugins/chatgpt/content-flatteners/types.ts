import type { MessageContent } from "../types";

export interface FlattenContext {
  sharedConversationId?: string;
  cookies?: string;
}

export interface ContentFlattener {
  readonly contentType: string;
  canHandle(content: MessageContent): boolean;
  flatten(content: MessageContent, context?: FlattenContext): Promise<string>;
}

export type ContentFlattenerRegistry = Map<string, ContentFlattener>;
