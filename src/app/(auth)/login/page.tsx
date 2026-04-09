"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Smartphone, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const { login, isLoggingIn, loginError } = useAuth();

  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!nip.trim() || !password) {
      setLocalError("NIP dan password wajib diisi");
      return;
    }

    try {
      await login({ nip: nip.trim(), password });
    } catch {
      // Error message exposed via loginError below.
    }
  }

  const errorMessage = localError ?? loginError;

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/images/gapuraangkasa.jpg"
          alt="Gapura Angkasa"
          width={240}
          height={80}
          priority
          className="h-16 w-auto object-contain"
        />
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          Kelola SDM Gapura Angkasa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Masuk dengan NIP dan password Anda
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nip">NIP</Label>
          <div className="relative">
            <User
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="nip"
              name="nip"
              type="text"
              autoComplete="username"
              placeholder="Masukkan NIP"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              disabled={isLoggingIn}
              className="pl-9"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoggingIn}
              className="px-9"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isLoggingIn}
          className="h-11 w-full text-sm font-semibold"
        >
          {isLoggingIn ? "Memproses..." : "Masuk"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Hubungi administrator jika Anda lupa password.
      </p>

      <div className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-xs text-muted-foreground">
        <Smartphone
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span>
          Pasang sebagai aplikasi di perangkat Anda melalui menu browser
          &quot;Add to Home Screen&quot; untuk akses lebih cepat.
        </span>
      </div>
    </div>
  );
}
