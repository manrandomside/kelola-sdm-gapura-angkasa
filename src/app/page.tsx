"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogIn,
  Plane,
  Shield,
  Smartphone,
  Sparkles,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import {
  SiNextdotjs,
  SiPostgresql,
  SiReact,
  SiTailwindcss,
  SiTypescript,
  SiVercel,
} from "react-icons/si";

import { HeroCarousel } from "@/components/landing/hero-carousel";
import { AnimatedCounter } from "@/components/landing/animated-counter";
import { InstallButton } from "@/components/pwa/install-button";
import { ROUTES } from "@/lib/constants/routes";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUDIENCE_CARDS = [
  {
    icon: Users,
    title: "Untuk Tim HR",
    description:
      "Kelola data 1000+ karyawan dalam satu platform. Import Excel, export laporan, monitoring kontrak otomatis, dan auto-create akun login untuk setiap karyawan baru.",
  },
  {
    icon: BarChart3,
    title: "Untuk Manajemen",
    description:
      "Dashboard analitik real-time dengan 7 chart interaktif, tren 12 bulan, perbandingan periode, dan tingkat turnover per provider untuk pengambilan keputusan strategis.",
  },
  {
    icon: User,
    title: "Untuk Karyawan",
    description:
      "Akses data pribadi dengan akun login otomatis (NIP = password), ubah password kapan saja, dan akses informasi kepegawaian secara aman.",
  },
] as const;

const STATS = [
  { value: 1000, suffix: "+", label: "Karyawan Terkelola", icon: Users },
  { value: 10, suffix: "", label: "Provider Terintegrasi", icon: Building2 },
  { value: 7, suffix: "", label: "Chart Interaktif", icon: BarChart3 },
  { value: 3, suffix: "", label: "Format Laporan PDF", icon: FileText },
] as const;

const FEATURES = [
  {
    icon: Users,
    title: "Manajemen Karyawan",
    description:
      "CRUD lengkap, pencarian, filter multi-kriteria, dan detail per karyawan dengan 5 tab informasi.",
  },
  {
    icon: FileSpreadsheet,
    title: "Import & Export Excel",
    description:
      "Wizard 4 langkah dengan column mapping otomatis, validasi per-cell, chunked import, dan rollback.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard Analitik",
    description:
      "7 chart interaktif, stat cards real-time, dan ringkasan rekap top 10 jabatan terbanyak.",
  },
  {
    icon: AlertCircle,
    title: "Monitoring Kontrak",
    description:
      "Color coding hari tersisa, auto-update status Non Aktif via cron job harian.",
  },
  {
    icon: Shield,
    title: "Multi-Provider Access",
    description:
      "10 akun Super Admin per provider dengan akses data terbatas sesuai providernya.",
  },
  {
    icon: Sparkles,
    title: "Asisten SDM AI",
    description:
      "Chatbot berbasis AI (Gemini & Groq) untuk tanya jawab data SDM dengan riwayat percakapan.",
  },
  {
    icon: FileText,
    title: "Laporan PDF",
    description:
      "3 jenis laporan profesional: Laporan Bulanan, Per Provider, dan Kontrak.",
  },
  {
    icon: Smartphone,
    title: "PWA Installable",
    description:
      "Install sebagai aplikasi native di Desktop, Android, dan iOS dengan satu klik.",
  },
] as const;

const WORKFLOW_STEPS = [
  {
    number: "01",
    icon: LogIn,
    title: "Login dengan NIP",
    description:
      "Masuk menggunakan NIP dan password. Akun otomatis dibuat saat data karyawan ditambahkan.",
  },
  {
    number: "02",
    icon: Database,
    title: "Kelola Data",
    description:
      "Tambah, edit, atau import data karyawan via Excel. Sistem akan validasi otomatis.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Analisa & Monitor",
    description:
      "Lihat dashboard analitik, monitoring kontrak, dan tren karyawan secara real-time.",
  },
  {
    number: "04",
    icon: Download,
    title: "Generate Laporan",
    description:
      "Export Excel atau generate laporan PDF profesional sesuai kebutuhan manajemen.",
  },
] as const;

const TECH_BADGES = [
  { name: "Next.js", version: "15", icon: SiNextdotjs, color: "#000000" },
  { name: "React", version: "19", icon: SiReact, color: "#61DAFB" },
  { name: "TypeScript", version: "5", icon: SiTypescript, color: "#3178C6" },
  { name: "PostgreSQL", version: "15", icon: SiPostgresql, color: "#4169E1" },
  { name: "Tailwind CSS", version: "4", icon: SiTailwindcss, color: "#06B6D4" },
  { name: "Vercel", version: "Edge", icon: SiVercel, color: "#000000" },
] as const;

const TECH_HIGHLIGHTS = [
  "Type-safe end-to-end dengan TypeScript",
  "Real-time updates dan responsif",
  "Keamanan data dengan RLS dan enkripsi",
  "Optimized untuk skala 1000+ karyawan",
] as const;

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 h-[72px] transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-white/95 shadow-sm backdrop-blur-sm"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/gapuraangkasa.jpg"
            alt="Gapura Angkasa"
            width={120}
            height={40}
            priority
            className="h-9 w-auto rounded-md object-contain"
          />
          <span
            className={`hidden text-lg font-bold transition-colors sm:inline ${
              scrolled ? "text-foreground" : "text-white drop-shadow-sm"
            }`}
          >
            Kelola SDM
          </span>
        </Link>
        <Link
          href={ROUTES.LOGIN}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            scrolled
              ? "bg-primary text-primary-foreground hover:bg-primary-hover"
              : "border-2 border-white/40 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
          }`}
        >
          Masuk ke Sistem
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — Hero with Carousel
// ---------------------------------------------------------------------------

function HeroSection() {
  return (
    <section className="relative h-[calc(100vh-72px)] min-h-[600px] w-full overflow-hidden">
      <div className="absolute inset-0">
        <HeroCarousel />
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/30 bg-white/15 px-4 py-2 backdrop-blur-sm"
          >
            <Plane className="h-4 w-4 text-white" />
            <span className="text-sm font-medium text-white">
              PT Gapura Angkasa - Bandar Udara Ngurah Rai
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="mb-6 text-4xl leading-tight font-bold text-white sm:text-5xl lg:text-6xl"
          >
            Sistem Manajemen
            <span className="mt-2 block bg-gradient-to-r from-green-200 to-white bg-clip-text text-transparent">
              Sumber Daya Manusia
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="mb-8 max-w-2xl text-lg leading-relaxed text-white/90 sm:text-xl"
          >
            Platform internal terintegrasi untuk mengelola data karyawan PT
            Gapura Angkasa secara efisien, aman, dan modern. Mendukung 10
            provider tenaga kerja dan 1000+ karyawan di Bali.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col gap-3 sm:flex-row sm:gap-4"
          >
            <Link
              href={ROUTES.LOGIN}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-[#439454] shadow-xl transition-all hover:bg-white/90"
            >
              Masuk ke Sistem
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
            <InstallButton variant="outline" />
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 animate-bounce sm:block">
        <ChevronDown className="h-6 w-6 text-white/70" />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section helpers
// ---------------------------------------------------------------------------

interface SectionBadgeProps {
  children: React.ReactNode;
  variant?: "light" | "dark";
}

function SectionBadge({ children, variant = "light" }: SectionBadgeProps) {
  const className =
    variant === "dark"
      ? "border-white/30 bg-white/20 text-white"
      : "border-[#439454]/20 bg-[#e8f5e9] text-[#2d5a37]";
  return (
    <div
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — Tentang Sistem
// ---------------------------------------------------------------------------

function AboutSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="mx-auto max-w-3xl text-center"
        >
          <SectionBadge>Tentang Sistem</SectionBadge>
          <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
            Solusi Lengkap untuk Manajemen SDM Modern
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Kelola SDM Gapura Angkasa adalah platform internal yang dirancang
            khusus untuk PT Gapura Angkasa di Bandar Udara Ngurah Rai. Dibangun
            untuk Tim HR, Manajemen, dan Karyawan dengan fokus pada efisiensi
            operasional, akurasi data, dan keamanan tingkat enterprise.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
        >
          {AUDIENCE_CARDS.map((card) => (
            <motion.div
              key={card.title}
              variants={fadeInUp}
              className="group rounded-2xl border border-gray-200 bg-gray-50 p-8 transition-all hover:border-[#439454] hover:shadow-lg"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 p-3">
                <card.icon className="h-6 w-6 text-[#439454]" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {card.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — Statistik
// ---------------------------------------------------------------------------

function StatsSection() {
  return (
    <section className="bg-gradient-to-br from-[#2d5a37] via-[#439454] to-[#3a8249] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="mx-auto max-w-3xl text-center"
        >
          <SectionBadge variant="dark">Dalam Angka</SectionBadge>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Skala dan Cakupan Sistem
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
            Sistem yang sudah diuji dan digunakan untuk mengelola operasional
            SDM secara komprehensif.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4"
        >
          {STATS.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              className="rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-md lg:p-8"
            >
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <p className="mt-4 text-4xl font-bold text-white lg:text-5xl">
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-sm text-white/80">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 4 — Fitur Lengkap
// ---------------------------------------------------------------------------

function FeaturesSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="mx-auto max-w-3xl text-center"
        >
          <SectionBadge>Fitur Lengkap</SectionBadge>
          <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
            Semua yang Anda Butuhkan dalam Satu Platform
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            8 fitur utama yang dirancang untuk mempercepat operasional HR Anda.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#439454] hover:shadow-xl"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 p-3">
                <feature.icon className="h-6 w-6 text-[#439454]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 5 — Workflow
// ---------------------------------------------------------------------------

function WorkflowSection() {
  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="mx-auto max-w-3xl text-center"
        >
          <SectionBadge>Alur Kerja</SectionBadge>
          <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
            Sederhana dan Mudah Digunakan
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            4 langkah untuk memulai mengelola data SDM Anda.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="relative mt-12 grid gap-8 lg:grid-cols-4 lg:gap-6"
        >
          {/* Connector line desktop */}
          <div
            aria-hidden
            className="absolute top-24 right-0 left-0 hidden h-[2px] bg-[repeating-linear-gradient(to_right,#86efac_0_8px,transparent_8px_16px)] lg:block"
          />

          {WORKFLOW_STEPS.map((step, index) => (
            <motion.div
              key={step.number}
              variants={fadeInUp}
              className="relative flex gap-4 lg:flex-col lg:items-center lg:text-center"
            >
              {/* Connector line mobile (sembunyikan di langkah terakhir) */}
              {index < WORKFLOW_STEPS.length - 1 && (
                <div
                  aria-hidden
                  className="absolute top-12 -bottom-8 left-7 w-[2px] bg-[repeating-linear-gradient(to_bottom,#86efac_0_8px,transparent_8px_16px)] lg:hidden"
                />
              )}

              <div className="flex flex-col items-center lg:contents">
                <span
                  aria-hidden
                  className="text-5xl font-bold text-[#439454]/30 lg:order-1 lg:text-6xl"
                >
                  {step.number}
                </span>
                <div className="relative z-10 mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-[#439454] text-white shadow-lg shadow-[#439454]/30 lg:order-2 lg:mt-4">
                  <step.icon className="h-7 w-7" />
                </div>
              </div>

              <div className="flex-1 lg:order-3 lg:mt-4 lg:flex-none">
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 6 — Tech Highlight
// ---------------------------------------------------------------------------

function TechSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <SectionBadge>Teknologi Modern</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
              Dibangun dengan Stack Terkini
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Sistem ini dibangun menggunakan Next.js 15, React 19, dan
              TypeScript untuk performa maksimal. Database PostgreSQL via
              Supabase dengan Row Level Security memastikan keamanan data
              tingkat enterprise.
            </p>

            <ul className="mt-6 space-y-3">
              {TECH_HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#439454]">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                  <span className="text-sm text-foreground sm:text-base">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 gap-4"
          >
            {TECH_BADGES.map((badge) => (
              <motion.div
                key={badge.name}
                variants={fadeInUp}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-[#439454]"
              >
                <badge.icon
                  className="h-7 w-7 shrink-0"
                  style={{ color: badge.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {badge.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {badge.version}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 7 — CTA Footer
// ---------------------------------------------------------------------------

function CtaSection() {
  return (
    <section className="bg-gradient-to-r from-[#2d5a37] to-[#439454] py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Siap Mengelola SDM dengan Lebih Baik?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            Akses sistem sekarang dan rasakan kemudahan mengelola data karyawan
            dalam satu platform terintegrasi.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={ROUTES.LOGIN}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-[#439454] shadow-xl transition-all hover:bg-white/90"
            >
              Masuk ke Sistem
              <ArrowRight className="h-4 w-4" />
            </Link>
            <InstallButton variant="outline" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/gapuraangkasa.jpg"
                alt="Gapura Angkasa"
                width={48}
                height={48}
                className="h-10 w-auto rounded-md object-contain"
              />
              <span className="text-base font-bold text-white">
                Kelola SDM Gapura Angkasa
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Platform internal manajemen sumber daya manusia PT Gapura Angkasa
              untuk operasional ground handling di Bali.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
              Lokasi Operasional
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Bandar Udara Internasional I Gusti Ngurah Rai, Tuban, Kuta,
              Badung, Bali, Indonesia
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
              Tentang
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Sistem internal PT Gapura Angkasa untuk pengelolaan data SDM.
            </p>
            <p className="mt-2 text-sm text-gray-500">Versi 1.0</p>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
          &copy; 2026 PT Gapura Angkasa. Sistem Internal.
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  useEffect(() => {
    document.title = "Kelola SDM Gapura Angkasa — Sistem Manajemen SDM";
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <StatsSection />
        <FeaturesSection />
        <WorkflowSection />
        <TechSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
