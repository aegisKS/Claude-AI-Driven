import { prisma } from "@/lib/prisma";

const CONTENT_MAX_LENGTH = 10000;

export async function getOrCreateConversation(conversationId?: string) {
  if (conversationId) {
    const existing = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (existing) return existing;
  }
  const conversation = await prisma.conversation.create({ data: {} });
  return { ...conversation, messages: [] };
}

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
) {
  if (!content || !content.trim()) {
    throw new Error("Message content cannot be empty");
  }
  return prisma.message.create({
    data: { conversationId, role, content: content.slice(0, CONTENT_MAX_LENGTH) },
  });
}

export async function getHistory(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function deleteConversation(conversationId: string) {
  await prisma.message.deleteMany({ where: { conversationId } });
  await prisma.conversation.delete({ where: { id: conversationId } });
}
