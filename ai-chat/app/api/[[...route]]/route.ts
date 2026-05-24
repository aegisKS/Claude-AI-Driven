import { Hono } from "hono";
import { handle } from "hono/vercel";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getOrCreateConversation,
  saveMessage,
  getHistory,
  deleteConversation,
} from "@/lib/db/conversation";
import { SYSTEM_PROMPT } from "@/lib/mastra/agent";
import type { ImageMediaType } from "@/types/chat";

export const runtime = "nodejs";

const MESSAGE_MAX_LENGTH = 4000;
const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_MEDIA_TYPES: ImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MONGODB_OBJECTID_REGEX = /^[a-f\d]{24}$/i;

const app = new Hono().basePath("/api");

interface RequestImage {
  data: string;
  mediaType: ImageMediaType;
}

app.post("/chat", async (c) => {
  let body: { message?: string; conversationId?: string; images?: RequestImage[] };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const { message, conversationId, images } = body;
  const trimmedMessage = message?.trim() ?? "";

  if (!trimmedMessage && (!images || images.length === 0)) {
    return c.json({ error: "メッセージまたは画像を入力してくださいませ" }, 400);
  }
  if (trimmedMessage.length > MESSAGE_MAX_LENGTH) {
    return c.json(
      { error: `メッセージは${MESSAGE_MAX_LENGTH}文字以内でお願いいたしますわ` },
      400
    );
  }

  if (images && images.length > 0) {
    for (const img of images) {
      if (!SUPPORTED_MEDIA_TYPES.includes(img.mediaType)) {
        return c.json({ error: "対応していない画像形式ですの" }, 400);
      }
      const byteLength = Math.ceil((img.data.length * 3) / 4);
      if (byteLength > IMAGE_MAX_SIZE_BYTES) {
        return c.json({ error: "画像サイズは5MB以内でお願いいたしますわ" }, 400);
      }
    }
  }

  let conversation;
  try {
    conversation = await getOrCreateConversation(conversationId);
    const dbContent = trimmedMessage || "[画像を送信しました]";
    await saveMessage(conversation.id, "user", dbContent);
  } catch (e) {
    console.error("DB error on chat init:", e);
    return c.json({ error: "データベースエラーが発生してしまいましたの" }, 500);
  }

  const history = conversation.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  type UserContentPart =
    | { type: "text"; text: string }
    | { type: "image"; image: string; mimeType: string };

  const userContent: UserContentPart[] = [];
  if (images && images.length > 0) {
    for (const img of images) {
      userContent.push({
        type: "image",
        image: img.data,
        mimeType: img.mediaType,
      });
    }
  }
  if (trimmedMessage) {
    userContent.push({ type: "text", text: trimmedMessage });
  }

  let result;
  try {
    result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: SYSTEM_PROMPT,
      messages: [
        ...history.slice(0, -1).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user" as const,
          content: userContent.length === 1 && userContent[0].type === "text"
            ? userContent[0].text
            : userContent,
        },
      ],
    });
  } catch (e) {
    console.error("AI stream error:", e);
    return c.json({ error: "AIサービスに接続できませんでしたの" }, 502);
  }

  let fullText = "";
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ conversationId: conversation.id })}\n\n`
          )
        );
        for await (const chunk of result.textStream) {
          fullText += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
          );
        }
        await saveMessage(conversation.id, "assistant", fullText);
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("Stream processing error:", e);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "ストリームエラーが発生してしまいましたの" })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

app.get("/history/:conversationId", async (c) => {
  const conversationId = c.req.param("conversationId");
  if (!MONGODB_OBJECTID_REGEX.test(conversationId)) {
    return c.json({ error: "Invalid conversationId" }, 400);
  }
  try {
    const history = await getHistory(conversationId);
    if (!history) return c.json({ error: "Not found" }, 404);
    return c.json(history);
  } catch (e) {
    console.error("DB error on history fetch:", e);
    return c.json({ error: "履歴の取得に失敗してしまいましたの" }, 500);
  }
});

app.delete("/history/:conversationId", async (c) => {
  const conversationId = c.req.param("conversationId");
  if (!MONGODB_OBJECTID_REGEX.test(conversationId)) {
    return c.json({ error: "Invalid conversationId" }, 400);
  }
  try {
    await deleteConversation(conversationId);
    return c.json({ success: true });
  } catch (e) {
    console.error("DB error on conversation delete:", e);
    return c.json({ success: false, error: "削除に失敗してしまいましたの" }, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
