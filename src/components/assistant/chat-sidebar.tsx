"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { ConversationListItem } from "@/hooks/use-conversations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatSidebarProps {
  conversations: ConversationListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Time grouping helpers
// ---------------------------------------------------------------------------

interface ConversationGroup {
  label: string;
  items: ConversationListItem[];
}

function groupConversations(
  conversations: ConversationListItem[],
): ConversationGroup[] {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const groups: Record<string, ConversationListItem[]> = {
    "Hari Ini": [],
    Kemarin: [],
    "7 Hari Lalu": [],
    "30 Hari Lalu": [],
    "Lebih Lama": [],
  };

  for (const conv of conversations) {
    const updatedAt = new Date(conv.updatedAt);
    if (updatedAt >= todayStart) {
      groups["Hari Ini"].push(conv);
    } else if (updatedAt >= yesterdayStart) {
      groups["Kemarin"].push(conv);
    } else if (updatedAt >= sevenDaysAgo) {
      groups["7 Hari Lalu"].push(conv);
    } else if (updatedAt >= thirtyDaysAgo) {
      groups["30 Hari Lalu"].push(conv);
    } else {
      groups["Lebih Lama"].push(conv);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function SidebarSkeleton() {
  return (
    <div className="space-y-3 px-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
          <div
            className="h-4 animate-pulse rounded bg-gray-200"
            style={{ width: `${60 + Math.random() * 40}%` }}
          />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline rename input
// ---------------------------------------------------------------------------

interface RenameInputProps {
  initialValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

function RenameInput({ initialValue, onSave, onCancel }: RenameInputProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      const trimmed = value.trim();
      if (trimmed) onSave(trimmed);
      else onCancel();
    } else if (e.key === "Escape") {
      onCancel();
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        className="flex-1 rounded border border-primary bg-white px-2 py-1 text-sm outline-none"
        autoFocus
      />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          const trimmed = value.trim();
          if (trimmed) onSave(trimmed);
          else onCancel();
        }}
        className="rounded p-0.5 text-primary hover:bg-primary/10"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation item
// ---------------------------------------------------------------------------

interface ConversationItemProps {
  conversation: ConversationListItem;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: ConversationItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (renaming) {
    return (
      <div className="px-2 py-1">
        <RenameInput
          initialValue={conversation.title}
          onSave={(title) => {
            onRename(title);
            setRenaming(false);
          }}
          onCancel={() => setRenaming(false)}
        />
      </div>
    );
  }

  const truncatedTitle =
    conversation.title.length > 30
      ? conversation.title.slice(0, 30) + "..."
      : conversation.title;

  return (
    <>
      <div className="group relative">
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
            isActive
              ? "bg-[#e8f5e9] font-semibold text-foreground"
              : "text-foreground/80 hover:bg-gray-100",
          )}
        >
          <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{truncatedTitle}</span>
        </button>

        {/* More button */}
        <div ref={menuRef} className="absolute right-1 top-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className={cn(
              "rounded p-1 transition-colors hover:bg-gray-200",
              menuOpen ? "visible" : "invisible group-hover:visible",
            )}
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setRenaming(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-gray-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Ubah Nama
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setDeleteOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Percakapan</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin hapus percakapan ini? Semua pesan akan hilang dan tidak bisa
              dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onDelete();
                setDeleteOpen(false);
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// ChatSidebar
// ---------------------------------------------------------------------------

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  isLoading,
  isMobile,
  onClose,
}: ChatSidebarProps) {
  const groups = groupConversations(conversations);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Riwayat Chat</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onNew}
            title="Percakapan Baru"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {isMobile && onClose && (
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <SidebarSkeleton />
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              Belum ada percakapan.
            </p>
            <p className="text-sm text-muted-foreground">
              Mulai percakapan baru!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeId}
                      onSelect={() => onSelect(conv.id)}
                      onRename={(title) => onRename(conv.id, title)}
                      onDelete={() => onDelete(conv.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
