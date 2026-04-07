"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

// Input pencarian dengan ikon Search di kiri, tombol clear di kanan, dan
// debounce agar tidak trigger request di setiap keystroke.
export function SearchInput({
  value,
  onChange,
  placeholder = "Cari nama, NIP, atau NIK...",
  className,
  debounceMs = 400,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounced = useDebounce(localValue, debounceMs);

  // Sinkronisasi ke parent saat debounce berubah.
  useEffect(() => {
    if (debounced !== value) {
      onChange(debounced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Sinkronisasi jika parent reset filter dari luar.
  useEffect(() => {
    if (value !== localValue && value === "") {
      setLocalValue("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="h-10 pl-9 pr-9"
      />
      {localValue && (
        <button
          type="button"
          aria-label="Hapus pencarian"
          onClick={() => setLocalValue("")}
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
