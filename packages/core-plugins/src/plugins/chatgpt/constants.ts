export const ContentType = {
  TEXT: "text",
  CODE: "code",
  THOUGHTS: "thoughts",
  REASONING_RECAP: "reasoning_recap",
  MULTIMODAL_TEXT: "multimodal_text",
  TOOL_RESPONSE: "tool_response",
  MODEL_EDITABLE_CONTEXT: "model_editable_context",
  IMAGE_ASSET_POINTER: "image_asset_pointer",
} as const;

export type ContentTypeValue = (typeof ContentType)[keyof typeof ContentType];

export const MessageRole = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system",
  TOOL: "tool",
} as const;

export type MessageRoleValue = (typeof MessageRole)[keyof typeof MessageRole];
