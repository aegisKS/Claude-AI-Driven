"use client";

import { useState, useRef, useEffect } from "react";
import type { Message } from "@/types/chat";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

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

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setNotice(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
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
        body: JSON.stringify({ message: text, conversationId }),
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
            <div className="message-bubble">{msg.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <button className="clear-button" onClick={clearHistory}>
          会話をリセット
        </button>
        <textarea
          className="chat-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; }}
          placeholder="メッセージを入力してください..."
          disabled={isLoading}
        />
        <button
          className="send-button"
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
