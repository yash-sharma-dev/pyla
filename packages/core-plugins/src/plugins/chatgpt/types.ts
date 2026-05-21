export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface MessageAuthor {
  role?: string;
  name?: string;
}

export interface ImageAssetPointer {
  content_type: "image_asset_pointer";
  asset_pointer: string;
  size_bytes?: number;
  width?: number | string;
  height?: number | string | string[];
  metadata?: {
    dalle?: {
      gen_id?: string;
      prompt?: string;
    };
    generation?: {
      gen_id?: string;
      width?: number | string;
      height?: number | string | string[];
    };
  };
}

export interface MessageContent {
  content_type?: string;
  parts?: (string | Record<string, JsonValue> | ImageAssetPointer)[];
  text?: string;
  language?: string;
  thoughts?: Array<{ summary?: string; content?: string }>;
}

export interface MessageNode {
  id?: string;
  message?: {
    id?: string;
    author?: MessageAuthor;
    content?: MessageContent;
    create_time?: number;
    metadata?: {
      is_visually_hidden_from_conversation?: boolean;
      user_context_message_data?: number;
      is_user_system_message?: boolean;
      shared_conversation_id?: string;
      is_redacted?: boolean;
      reasoning_status?: string;
      citations?: unknown[];
      content_references?: unknown[];
    };
  };
  parent?: string;
  children?: string[];
}

export interface ChatGPTConversationResponse {
  conversation_id?: string;
  title?: string;
  mapping?: Record<string, MessageNode>;
  current_node?: string;
}
