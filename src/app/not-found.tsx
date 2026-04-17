import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted mx-auto">
          <FileQuestion className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Halaman Tidak Ditemukan</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Halaman yang Anda cari tidak ada atau sudah dipindahkan.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
          >
            <Home className="size-4" />
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
