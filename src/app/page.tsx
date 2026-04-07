export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold text-foreground">
        Kelola SDM Gapura Angkasa
      </h1>
      <p className="text-muted-foreground">
        Sistem Manajemen Data SDM PT Gapura Angkasa
      </p>
      <div className="mt-4 flex gap-2">
        <span className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Primary
        </span>
        <span className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
          Accent
        </span>
      </div>
    </div>
  );
}
