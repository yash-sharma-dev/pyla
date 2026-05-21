/** Participant in a content bundle */
export interface Participant {
  id: string;
  /** Display name (@username, "User", "Assistant", etc.) */
  name: string;
  /** Optional role label, used in serialized output */
  role?: string;
  /** Platform-specific data */
  meta?: Record<string, unknown>;
}

/** Content node — a single piece of content within a bundle */
export interface ContentNode {
  id: string;
  /** Participant ID, references participants[] */
  participantId: string;
  /** Markdown content */
  content: string;
  /** Sort order within the same level */
  order: number;
  /** Child nodes (e.g., comments on an answer) */
  children?: ContentNode[];
  /** ISO timestamp */
  timestamp?: string;
  /** Node type label ("message", "question", "answer", "comment", etc.) */
  type?: string;
  /** Platform-specific data (votes, accepted mark, etc.) */
  meta?: Record<string, unknown>;
}

/** Source metadata */
export interface SourceMeta {
  /** Platform name ("chatgpt", "claude", "stackoverflow", etc.) */
  platform: string;
  url?: string;
  extractedAt: string;
  pluginId: string;
  pluginVersion: string;
}

/** Universal content container — the single output type for the Plugin system */
export interface ContentBundle {
  id: string;
  title?: string;
  participants: Participant[];
  nodes: ContentNode[];
  source: SourceMeta;
  /** Platform-specific tags (SO tags, GitHub labels, etc.) */
  tags?: string[];
}
