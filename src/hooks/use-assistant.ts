import { useCallback, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const loadingMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsLoading(true);

      // Build message history for multi-turn context
      const history = [
        ...messages
          .filter((m) => !m.isLoading && !m.isError)
          .map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: trimmed },
      ];

      abortRef.current = new AbortController();

      try {
        const response = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, conversationId }),
          signal: abortRef.current.signal,
        });

        const data = await response.json();

        if (data.success) {
          // Track conversationId from response
          if (data.data.conversationId) {
            setConversationId(data.data.conversationId);
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingMsg.id
                ? {
                    ...m,
                    content: data.data.content,
                    provider: data.data.provider,
                    isLoading: false,
                    timestamp: new Date(),
                  }
                : m,
            ),
          );
        } else {
          const errorMessage =
            data.error?.message ??
            "Maaf, terjadi kesalahan. Silakan coba lagi.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingMsg.id
                ? {
                    ...m,
                    content: errorMessage,
                    isLoading: false,
                    isError: true,
                    timestamp: new Date(),
                  }
                : m,
            ),
          );
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Request was cancelled, remove loading message
          setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id));
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingMsg.id
                ? {
                    ...m,
                    content: "Maaf, terjadi kesalahan. Silakan coba lagi.",
                    isLoading: false,
                    isError: true,
                    timestamp: new Date(),
                  }
                : m,
            ),
          );
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [isLoading, messages, conversationId],
  );

  const retry = useCallback(() => {
    // Find the last user message and resend
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;

    // Remove the error message
    setMessages((prev) => {
      const lastErrorIdx = prev.findLastIndex((m) => m.isError);
      if (lastErrorIdx >= 0) {
        return prev.filter((_, i) => i !== lastErrorIdx);
      }
      return prev;
    });

    const trimmed = lastUserMsg.content;
    const loadingMsg: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    // Remove error and re-add loading
    setMessages((prev) => {
      const cleaned = prev.filter((m) => !m.isError);
      return [...cleaned, loadingMsg];
    });
    setIsLoading(true);

    const history = messages
      .filter((m) => !m.isLoading && !m.isError)
      .map((m) => ({ role: m.role, content: m.content }));

    const controller = new AbortController();
    abortRef.current = controller;

    fetch("/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, conversationId }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.data.conversationId) {
            setConversationId(data.data.conversationId);
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingMsg.id
                ? {
                    ...m,
                    content: data.data.content,
                    provider: data.data.provider,
                    isLoading: false,
                    timestamp: new Date(),
                  }
                : m,
            ),
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingMsg.id
                ? {
                    ...m,
                    content:
                      data.error?.message ??
                      "Maaf, terjadi kesalahan. Silakan coba lagi.",
                    isLoading: false,
                    isError: true,
                    timestamp: new Date(),
                  }
                : m,
            ),
          );
        }
      })
      .catch(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? {
                  ...m,
                  content: "Maaf, terjadi kesalahan. Silakan coba lagi.",
                  isLoading: false,
                  isError: true,
                  timestamp: new Date(),
                }
              : m,
          ),
        );
      })
      .finally(() => {
        setIsLoading(false);
        abortRef.current = null;
      });
  }, [messages, conversationId]);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setIsLoading(false);
  }, []);

  const loadConversation = useCallback(
    (id: string, loadedMessages: ChatMessage[]) => {
      setConversationId(id);
      setMessages(loadedMessages);
    },
    [],
  );

  return {
    messages,
    isLoading,
    conversationId,
    sendMessage,
    clearChat,
    retry,
    loadConversation,
  };
}
