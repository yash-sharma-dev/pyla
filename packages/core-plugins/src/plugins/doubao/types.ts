/** Doubao IM chain single response — fetches conversation messages */
export interface DoubaoChainResponse {
  cmd: number;
  sequence_id: string;
  downlink_body?: {
    pull_singe_chain_downlink_body?: {
      messages?: DoubaoMessage[];
      has_more?: boolean;
    };
  };
}

/** Doubao conversation info response */
export interface DoubaoConversationInfoResponse {
  cmd: number;
  sequence_id: string;
  downlink_body?: {
    get_conv_info_downlink_body?: {
      conversation_info?: {
        conversation_id?: string;
        name?: string;
        create_time?: string;
        update_time?: string;
      };
    };
  };
}

/** Single message from Doubao IM chain */
export interface DoubaoMessage {
  conversation_id: string;
  message_id: string;
  sender_id: string;
  /** 1 = user, 2 = bot/assistant */
  user_type: number;
  status: number;
  content_type: number;
  content: string;
  content_status: number;
  /** Position in conversation (numeric string) */
  index_in_conv: string;
  create_time: string;
  thinking_content: string;
  content_block?: DoubaoContentBlock[];
  section_id?: string;
}

/** Content block within a Doubao message */
export interface DoubaoContentBlock {
  block_type: number;
  block_id: string;
  parent_id: string;
  content?: {
    text_block?: {
      text: string;
      icon_url?: string;
      icon_url_dark?: string;
      summary?: string;
    };
  };
}
