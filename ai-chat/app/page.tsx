"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Message, MessageImage, ImageMediaType } from "@/types/chat";

const SUPPORTED_TYPES: ImageMediaType[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<MessageImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("conversationId");
    if (saved) {
      setConversationId(saved);
      fetch(`/api/history/${saved}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          if (data.messages) setMessages(data.messages);
        })
        .catch(() => {
          setNotice("過去の会話履歴を読み込めませんでしたの。新しい会話を始めますわ♪");
          localStorage.removeItem("conversationId");
        });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const setErrorOnLastMessage = (errorText: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content: errorText,
      };
      return updated;
    });
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter((f) => SUPPORTED_TYPES.includes(f.type as ImageMediaType));

    if (imageFiles.length === 0) {
      setNotice("PNG、JPEG、GIF、WebP 形式の画像のみ対応していますの");
      return;
    }

    imageFiles.forEach((file) => {
      if (file.size > MAX_IMAGE_BYTES) {
        setNotice(`「${file.name}」は5MBを超えていますの。小さい画像をお使いくださいませ`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        setPendingImages((prev) => [
          ...prev,
          { data: base64, mediaType: file.type as ImageMediaType, preview: dataUrl },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && pendingImages.length === 0) || isLoading) return;

    setNotice(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      images: pendingImages.length > 0 ? [...pendingImages] : undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPendingImages([]);
    setIsLoading(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
          images: userMessage.images?.map((img) => ({
            data: img.data,
            mediaType: img.mediaType,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setErrorOnLastMessage(
          errData.error ?? "申し訳ございません、エラーが発生してしまいましたの..."
        );
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          let parsed: Record<string, string>;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }

          if (parsed.error) {
            setErrorOnLastMessage(parsed.error);
            return;
          }
          if (parsed.conversationId) {
            setConversationId(parsed.conversationId);
            localStorage.setItem("conversationId", parsed.conversationId);
          }
          if (parsed.chunk) {
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + parsed.chunk,
              };
              return updated;
            });
          }
        }
      }
    } catch {
      setErrorOnLastMessage("申し訳ございません、エラーが発生してしまいましたの...");
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!conversationId) return;
    try {
      await fetch(`/api/history/${conversationId}`, { method: "DELETE" });
    } catch {
      // ローカルは必ずリセット
    }
    setMessages([]);
    setConversationId(null);
    setPendingImages([]);
    localStorage.removeItem("conversationId");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <img src="/maid-avatar.svg" alt="メイドアバター" />
        <div className="chat-header-info">
          <h1>メイドさん</h1>
          <p>ご主人様のことをお待ちしておりましたのです♪</p>
        </div>
      </div>

      {notice && (
        <div style={{ background: "#fff3cd", color: "#856404", padding: "8px 16px", fontSize: 13 }}>
          {notice}
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#b07fd4", marginTop: 40 }}>
            <p>ご主人様、いらっしゃいませなのです！</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>
              何でもお気軽にお話しくださいませ♪
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            {msg.role === "assistant" && (
              <img
                src="/maid-avatar.svg"
                alt="メイド"
                className="message-avatar"
              />
            )}
            <div className="message-bubble">
              {msg.images && msg.images.length > 0 && (
                <div className="message-images">
                  {msg.images.map((img, i) => (
                    <img
                      key={i}
                      src={img.preview}
                      alt={`添付画像 ${i + 1}`}
                      className="message-image"
                    />
                  ))}
                </div>
              )}
              {msg.content && <span>{msg.content}</span>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div
        className={`chat-input-area${isDragOver ? " drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {pendingImages.length > 0 && (
          <div className="image-preview-area">
            {pendingImages.map((img, i) => (
              <div key={i} className="image-preview-item">
                <img src={img.preview} alt={`プレビュー ${i + 1}`} />
                <button
                  className="image-preview-remove"
                  onClick={() => removeImage(i)}
                  aria-label="画像を削除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="chat-input-row">
          <button className="clear-button" onClick={clearHistory}>
            会話をリセット
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            className="attach-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label="画像を添付"
            title="画像を添付"
          >
            📎
          </button>
          <textarea
            className="chat-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={() => { isComposingRef.current = false; }}
            placeholder="メッセージを入力、または画像をドロップ..."
            disabled={isLoading}
          />
          <button
            className="send-button"
            onClick={sendMessage}
            disabled={isLoading || (!input.trim() && pendingImages.length === 0)}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
