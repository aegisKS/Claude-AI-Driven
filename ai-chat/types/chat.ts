export type Role = "user" | "assistant";

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface MessageImage {
  data: string;
  mediaType: ImageMediaType;
  preview: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  images?: MessageImage[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}
