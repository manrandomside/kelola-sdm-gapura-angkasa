"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-100 mx-auto">
          <AlertTriangle className="size-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Terjadi Kesalahan</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Aplikasi mengalami masalah. Tim kami akan memperbaiki ini secepatnya.
        </p>
        {process.env.NODE_ENV === "development" && (
          <details className="mb-6 text-left p-3 bg-red-50 rounded text-xs text-red-900">
            <summary className="cursor-pointer font-medium mb-2">
              Detail Error
            </summary>
            <pre className="whitespace-pre-wrap break-all">{error.message}</pre>
            {error.digest && <p className="mt-2">Digest: {error.digest}</p>}
          </details>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
          >
            <RefreshCw className="size-4" />
            Coba Lagi
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted"
          >
            <Home className="size-4" />
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
