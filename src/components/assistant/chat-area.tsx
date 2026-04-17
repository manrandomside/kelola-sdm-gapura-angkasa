"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Info,
  Menu,
  Plus,
  RefreshCw,
  Send,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/hooks/use-assistant";

// ---------------------------------------------------------------------------
// Example questions
// ---------------------------------------------------------------------------

const EXAMPLE_QUESTIONS = [
  "Berapa total karyawan aktif saat ini?",
  "Provider mana yang paling banyak karyawannya?",
  "Berapa kontrak yang akan berakhir dalam 30 hari?",
  "Buatkan ringkasan SDM untuk presentasi",
];

// ---------------------------------------------------------------------------
// Time formatter (WITA)
// ---------------------------------------------------------------------------

function formatTime(date: Date): string {
  return (
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Makassar",
    }) + " WITA"
  );
}

// ---------------------------------------------------------------------------
// Typing dots animation
// ---------------------------------------------------------------------------

function TypingDots() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-muted-foreground">
        Sedang memikirkan jawaban...
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: () => void;
}

function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] min-w-0">
          <div className="rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground">
            <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
          </div>
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </motion.div>
    );
  }

  // Assistant loading
  if (message.isLoading) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%]">
          <div className="rounded-2xl rounded-bl-md border bg-white px-4 py-3">
            <TypingDots />
          </div>
        </div>
      </div>
    );
  }

  // Assistant error
  if (message.isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-start"
      >
        <div className="max-w-[80%]">
          <div className="rounded-2xl rounded-bl-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="whitespace-pre-wrap text-sm text-red-700">
              {message.content}
            </p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600 transition-colors hover:text-red-800"
            >
              <RefreshCw className="h-3 w-3" />
              Coba Lagi
            </button>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </motion.div>
    );
  }

  // Normal assistant message
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start"
    >
      <div className="max-w-[80%]">
        <div className="min-w-0 rounded-2xl rounded-bl-md border bg-white px-4 py-3">
          <div className="chat-content prose prose-sm max-w-none overflow-hidden whitespace-pre-wrap break-words text-sm text-foreground">
            {message.content}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {message.provider && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Zap className="h-3 w-3" />
              via {message.provider === "gemini" ? "Gemini" : "Groq"}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Welcome state
// ---------------------------------------------------------------------------

interface WelcomeStateProps {
  onQuestionClick: (question: string) => void;
}

function WelcomeState({ onQuestionClick }: WelcomeStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <h2 className="mt-4 text-center text-lg font-semibold text-foreground">
        Halo! Saya Asisten SDM PT Gapura Angkasa.
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        Saya bisa membantu menjawab pertanyaan tentang data karyawan berdasarkan
        data terkini.
      </p>
      <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {EXAMPLE_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onQuestionClick(question)}
            className="rounded-xl border bg-white px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            {question}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Percakapan akan otomatis tersimpan
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat input
// ---------------------------------------------------------------------------

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }

  return (
    <div className="border-t bg-white px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ketik pertanyaan tentang data SDM..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Kirim</span>
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatArea
// ---------------------------------------------------------------------------

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  onRetry: () => void;
  conversationTitle: string | null;
  providerBanner: string | null;
  onToggleSidebar?: () => void;
  onNewChat?: () => void;
}

export function ChatArea({
  messages,
  isLoading,
  onSend,
  onRetry,
  conversationTitle,
  providerBanner,
  onToggleSidebar,
  onNewChat,
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3 lg:px-6 lg:py-4">
        <div className="flex items-center gap-3">
          {/* Mobile-only: hamburger and new chat */}
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleSidebar}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-foreground">
              {conversationTitle ?? "Asisten SDM"}
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Tanyakan apa saja tentang data SDM
            </p>
          </div>

          {/* Mobile-only: new chat button */}
          {onNewChat && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onNewChat}
              className="lg:hidden"
              title="Percakapan Baru"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Provider scope banner */}
      {providerBanner && (
        <div className="flex items-center justify-center gap-1.5 border-b bg-blue-50 px-4 py-2 text-center text-xs text-blue-700">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Asisten hanya menjawab berdasarkan data {providerBanner}
        </div>
      )}

      {/* Chat messages area */}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto bg-gray-50/50",
          !hasMessages && "flex",
        )}
      >
        {!hasMessages ? (
          <WelcomeState onQuestionClick={onSend} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRetry={msg.isError ? onRetry : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput onSend={onSend} disabled={isLoading} />

      {/* Footer */}
      <div className="flex items-center justify-center border-t bg-white px-4 py-1.5">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Zap className="h-3 w-3" />
          Powered by Gemini / Groq
        </span>
      </div>
    </div>
  );
}
