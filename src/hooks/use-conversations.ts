import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationListItem {
  id: string;
  title: string;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider: string | null;
  createdAt: string;
}

export interface ConversationDetail {
  conversation: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: ConversationMessage[];
}

// ---------------------------------------------------------------------------
// useConversations — list conversations
// ---------------------------------------------------------------------------

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/assistant/conversations");
      const data = await res.json();
      if (data.success) {
        setConversations(data.data.conversations);
      }
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, isLoading, refetch: fetchConversations };
}

// ---------------------------------------------------------------------------
// useConversationMessages — get a single conversation with messages
// ---------------------------------------------------------------------------

export function useConversationMessages(id: string | null) {
  const [data, setData] = useState<ConversationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!id) {
      setData(null);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/assistant/conversations/${id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { conversation: data?.conversation ?? null, messages: data?.messages ?? [], isLoading };
}

// ---------------------------------------------------------------------------
// useCreateConversation
// ---------------------------------------------------------------------------

export function useCreateConversation() {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async () => {
    setIsPending(true);
    try {
      const res = await fetch("/api/assistant/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (data.success) {
        return data.data.conversation as {
          id: string;
          title: string;
          createdAt: string;
          updatedAt: string;
        };
      }
      return null;
    } catch {
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending };
}

// ---------------------------------------------------------------------------
// useRenameConversation
// ---------------------------------------------------------------------------

export function useRenameConversation() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (id: string, title: string) => {
      setIsPending(true);
      try {
        await fetch(`/api/assistant/conversations/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
      } catch {
        // silent fail
      } finally {
        setIsPending(false);
      }
    },
    [],
  );

  return { mutate, isPending };
}

// ---------------------------------------------------------------------------
// useDeleteConversation
// ---------------------------------------------------------------------------

export function useDeleteConversation() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (id: string) => {
    setIsPending(true);
    try {
      await fetch(`/api/assistant/conversations/${id}`, {
        method: "DELETE",
      });
    } catch {
      // silent fail
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending };
}
