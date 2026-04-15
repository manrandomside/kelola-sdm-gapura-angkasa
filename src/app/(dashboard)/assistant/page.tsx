"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  RefreshCw,
  Send,
  Trash2,
  Zap,
} from "lucide-react";

import { useAssistant, type ChatMessage } from "@/hooks/use-assistant";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Makassar",
  }) + " WITA";
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
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground">
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          </div>
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  // Assistant message
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

  if (message.isError) {
    return (
      <div className="flex justify-start">
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
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-bl-md border bg-white px-4 py-3">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground">
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
    </div>
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
        Saya bisa membantu menjawab pertanyaan tentang data karyawan berdasarkan data terkini.
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider scope banner
// ---------------------------------------------------------------------------

function ProviderScopeBanner({ provider }: { provider: string }) {
  return (
    <div className="border-b bg-amber-50 px-4 py-2 text-center text-xs text-amber-700">
      Asisten hanya menjawab berdasarkan data {provider}
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
    // Reset textarea height
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
    // Max 4 lines (~96px)
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
// Main page
// ---------------------------------------------------------------------------

export default function AssistantPage() {
  const { messages, isLoading, sendMessage, clearChat, retry } = useAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [providerScope, setProviderScope] = useState<string | null>(null);
  const [contextLoaded, setContextLoaded] = useState(false);

  // Fetch context once to determine provider scope
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

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Asisten SDM</h1>
            <p className="text-xs text-muted-foreground">
              Tanyakan apa saja tentang data SDM. Dijawab berdasarkan data real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Provider scope banner */}
      {contextLoaded && providerScope && (
        <ProviderScopeBanner provider={providerScope} />
      )}

      {/* Chat area */}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto bg-gray-50/50",
          !hasMessages && "flex",
        )}
      >
        {!hasMessages ? (
          <WelcomeState onQuestionClick={sendMessage} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRetry={msg.isError ? retry : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />

      {/* Footer */}
      <div className="flex items-center justify-between border-t bg-white px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          disabled={messages.length === 0}
          className="text-xs text-muted-foreground"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Hapus Percakapan
        </Button>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Zap className="h-3 w-3" />
          Powered by Gemini / Groq
        </span>
      </div>
    </div>
  );
}
