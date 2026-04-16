"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

// ---------------------------------------------------------------------------
// Left panel feature bullets
// ---------------------------------------------------------------------------

const FEATURES = [
  { icon: Users, text: "1000+ Data Karyawan" },
  { icon: Shield, text: "Multi-Provider Access" },
  { icon: BarChart3, text: "Dashboard Analitik" },
  { icon: Bot, text: "Asisten SDM AI" },
];

// ---------------------------------------------------------------------------
// Left branding panel (desktop only)
// ---------------------------------------------------------------------------

function BrandingPanel() {
  return (
    <div className="hidden flex-col items-start justify-center bg-gradient-to-br from-[#439454] to-[#2d5a37] px-8 md:flex lg:px-12 xl:px-16">
      {/* Geometric pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 max-w-md">
        <Image
          src="/images/gapuraangkasa.jpg"
          alt="Gapura Angkasa"
          width={280}
          height={80}
          priority
          className="h-16 w-auto object-contain brightness-0 invert"
        />

        <h1 className="mt-8 text-3xl font-bold leading-tight text-white xl:text-4xl">
          Kelola SDM
          <br />
          Gapura Angkasa
        </h1>

        <p className="mt-4 text-base leading-relaxed text-white/75">
          Sistem Manajemen Sumber Daya Manusia internal PT Gapura Angkasa di
          Bandar Udara I Gusti Ngurah Rai, Bali.
        </p>

        <ul className="mt-8 space-y-3">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                <f.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white/90">
                {f.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login form panel
// ---------------------------------------------------------------------------

function LoginForm() {
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
      // Error message exposed via loginError.
    }
  }

  const errorMessage = localError ?? loginError;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10 sm:px-10">
      <div className="w-full max-w-sm">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Beranda
        </Link>

        {/* Mobile logo */}
        <div className="mb-6 md:hidden">
          <Image
            src="/images/gapuraangkasa.jpg"
            alt="Gapura Angkasa"
            width={180}
            height={60}
            priority
            className="h-12 w-auto object-contain"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h2 className="text-2xl font-bold text-foreground">
            Masuk ke Sistem
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Masuk untuk mengelola data SDM
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nip">NIP</Label>
              <Input
                id="nip"
                name="nip"
                type="text"
                autoComplete="username"
                placeholder="Masukkan NIP Anda"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                disabled={isLoggingIn}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                  className="pr-10"
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
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Hubungi administrator jika Anda lupa password.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LoginPage() {
  return (
    <div className="grid min-h-screen md:grid-cols-[35fr_65fr] lg:grid-cols-2">
      <BrandingPanel />
      <LoginForm />
    </div>
  );
}
