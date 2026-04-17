"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, User } from "lucide-react";

import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { useGlobalSearch } from "@/hooks/use-global-search";

export const GlobalSearch = forwardRef<HTMLInputElement>(
  function GlobalSearch(_, forwardedRef) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [showResults, setShowResults] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (forwardedRef ??
      internalRef) as React.RefObject<HTMLInputElement | null>;

    const { employees, total, isLoading, debouncedQuery } =
      useGlobalSearch(query);

    const hasResults = employees.length > 0;
    const showDropdown = showResults && debouncedQuery.length >= 2;

    // Close dropdown on click outside.
    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setShowResults(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Reset selected index when results change.
    useEffect(() => {
      setSelectedIndex(-1);
    }, [employees]);

    const navigateToEmployee = useCallback(
      (id: number) => {
        setShowResults(false);
        setQuery("");
        router.push(ROUTES.EMPLOYEES_DETAIL(id));
      },
      [router],
    );

    const navigateToSearch = useCallback(() => {
      if (!query.trim()) return;
      setShowResults(false);
      const q = query.trim();
      setQuery("");
      router.push(`${ROUTES.EMPLOYEES}?search=${encodeURIComponent(q)}`);
    }, [query, router]);

    function handleKeyDown(e: React.KeyboardEvent) {
      if (!showDropdown) {
        if (e.key === "Enter") {
          navigateToSearch();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < employees.length ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : employees.length,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < employees.length) {
            navigateToEmployee(employees[selectedIndex].id);
          } else {
            navigateToSearch();
          }
          break;
        case "Escape":
          setShowResults(false);
          setQuery("");
          inputRef.current?.blur();
          break;
      }
    }

    function getInitials(name: string): string {
      return name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }

    return (
      <div ref={containerRef} className="relative">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari karyawan..."
            className="h-9 w-full rounded-lg border bg-muted/50 pl-9 pr-16 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:bg-white focus:ring-2 focus:ring-primary/20 sm:w-[280px] lg:w-[320px]"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => {
              if (query.length >= 2) setShowResults(true);
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
            Ctrl+K
          </kbd>
        </div>

        {/* Dropdown results */}
        {showDropdown && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[320px] overflow-hidden rounded-xl border bg-white shadow-lg">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Mencari...
              </div>
            ) : !hasResults ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Tidak ada hasil untuk &quot;{debouncedQuery}&quot;
              </div>
            ) : (
              <>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Hasil pencarian &quot;{debouncedQuery}&quot;
                </div>
                <div className="max-h-[280px] overflow-y-auto">
                  {employees.map((emp, idx) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => navigateToEmployee(emp.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                        selectedIndex === idx && "bg-muted/50",
                      )}
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(emp.nama_lengkap)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {emp.nama_lengkap}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          NIP: {emp.nip}
                          {emp.unit_organisasi && ` · ${emp.unit_organisasi}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                {total > 5 && (
                  <button
                    type="button"
                    onClick={navigateToSearch}
                    className={cn(
                      "flex w-full items-center justify-center gap-1 border-t px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-muted/50",
                      selectedIndex === employees.length && "bg-muted/50",
                    )}
                  >
                    Lihat semua {total.toLocaleString("id-ID")} hasil
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  },
);
