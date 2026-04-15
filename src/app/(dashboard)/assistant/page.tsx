"use client";

import { useCallback, useEffect, useState } from "react";

import { useAssistant, type ChatMessage } from "@/hooks/use-assistant";
import {
  useConversations,
  useConversationMessages,
  useRenameConversation,
  useDeleteConversation,
} from "@/hooks/use-conversations";
import { ChatSidebar } from "@/components/assistant/chat-sidebar";
import { ChatArea } from "@/components/assistant/chat-area";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AssistantPage() {
  // ---- Conversation state -------------------------------------------------
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [providerScope, setProviderScope] = useState<string | null>(null);
  const [contextLoaded, setContextLoaded] = useState(false);

  // ---- Hooks --------------------------------------------------------------
  const {
    conversations,
    isLoading: convLoading,
    refetch: refetchConversations,
  } = useConversations();

  const { messages: dbMessages, isLoading: messagesLoading } =
    useConversationMessages(activeConversationId);

  const {
    messages,
    isLoading: aiLoading,
    conversationId: trackedConversationId,
    sendMessage,
    clearChat,
    retry,
    loadConversation,
  } = useAssistant();

  const { mutate: renameConversation } = useRenameConversation();
  const { mutate: deleteConversation } = useDeleteConversation();

  // ---- Provider scope -----------------------------------------------------
  useEffect(() => {
    fetch("/api/assistant/context")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.providerUser) {
          setProviderScope(data.data.providerUser);
        }
        setContextLoaded(true);
      })
      .catch(() => {
        setContextLoaded(true);
      });
  }, []);

  // ---- Load conversation messages when selected ---------------------------
  useEffect(() => {
    if (!activeConversationId || messagesLoading || dbMessages.length === 0)
      return;

    const loaded: ChatMessage[] = dbMessages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      provider: m.provider ?? undefined,
      timestamp: new Date(m.createdAt),
    }));

    loadConversation(activeConversationId, loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, dbMessages, messagesLoading]);

  // ---- Track new conversation created by chat API -------------------------
  useEffect(() => {
    if (
      trackedConversationId &&
      trackedConversationId !== activeConversationId
    ) {
      setActiveConversationId(trackedConversationId);
      refetchConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedConversationId]);

  // ---- Refetch conversation list after AI response ------------------------
  useEffect(() => {
    if (!aiLoading && messages.length > 0) {
      refetchConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiLoading]);

  // ---- Handlers -----------------------------------------------------------
  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id === activeConversationId) {
        setSidebarOpen(false);
        return;
      }
      setActiveConversationId(id);
      setSidebarOpen(false);
    },
    [activeConversationId],
  );

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    clearChat();
    setSidebarOpen(false);
  }, [clearChat]);

  const handleRename = useCallback(
    async (id: string, title: string) => {
      await renameConversation(id, title);
      refetchConversations();
    },
    [renameConversation, refetchConversations],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      if (id === activeConversationId) {
        setActiveConversationId(null);
        clearChat();
      }
      refetchConversations();
    },
    [deleteConversation, activeConversationId, clearChat, refetchConversations],
  );

  // ---- Determine conversation title ---------------------------------------
  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const conversationTitle = activeConv?.title ?? null;

  // ---- Render -------------------------------------------------------------
  const sidebarContent = (
    <ChatSidebar
      conversations={conversations}
      activeId={activeConversationId}
      onSelect={handleSelectConversation}
      onNew={handleNewChat}
      onRename={handleRename}
      onDelete={handleDelete}
      isLoading={convLoading}
    />
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Desktop sidebar */}
      <div className="hidden w-[280px] shrink-0 border-r lg:block">
        {sidebarContent}
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[280px] p-0">
          <SheetTitle className="sr-only">Riwayat Chat</SheetTitle>
          <ChatSidebar
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewChat}
            onRename={handleRename}
            onDelete={handleDelete}
            isLoading={convLoading}
            isMobile
            onClose={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Chat area */}
      <div className="flex-1">
        <ChatArea
          messages={messages}
          isLoading={aiLoading}
          onSend={sendMessage}
          onRetry={retry}
          conversationTitle={conversationTitle}
          providerBanner={contextLoaded ? providerScope : null}
          onToggleSidebar={() => setSidebarOpen(true)}
          onNewChat={handleNewChat}
        />
      </div>
    </div>
  );
}
