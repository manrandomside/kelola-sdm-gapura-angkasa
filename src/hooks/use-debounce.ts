"use client";

import { useEffect, useState } from "react";

// Debounce nilai input selama `delayMs` milidetik. Berguna untuk menunda
// trigger search saat user sedang mengetik.
export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
