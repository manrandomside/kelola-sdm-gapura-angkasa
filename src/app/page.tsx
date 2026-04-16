"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  MapPin,
  Shield,
  Users,
} from "lucide-react";
import { motion, useInView } from "framer-motion";

import { InstallButton } from "@/components/pwa/install-button";
import { ROUTES } from "@/lib/constants/routes";

// ---------------------------------------------------------------------------
// Metadata is handled in a separate head component since this is a client
// component. We set the document title via useEffect.
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: Users,
    title: "Manajemen Data SDM",
    description:
      "Kelola data pribadi, kepegawaian, pendidikan, dan administrasi seluruh karyawan. Monitoring kontrak otomatis dengan color coding.",
  },
  {
    icon: FileSpreadsheet,
    title: "Import & Export Excel",
    description:
      "Import data massal dari Excel/CSV dan export dengan filter custom. Template profesional dengan 45 kolom data.",
  },
  {
    icon: BarChart3,
    title: "Dashboard & Analitik",
    description:
      "7 chart interaktif, statistik real-time, tren bulanan, perbandingan periode, dan turn-over rate per provider.",
  },
  {
    icon: Bot,
    title: "Asisten SDM AI",
    description:
      "Tanyakan apa saja tentang data SDM. Dijawab oleh AI berdasarkan data real-time. Riwayat percakapan tersimpan.",
  },
  {
    icon: FileText,
    title: "Laporan PDF",
    description:
      "Generate laporan bulanan, per provider, dan kontrak dalam format PDF profesional dengan logo perusahaan.",
  },
  {
    icon: Shield,
    title: "Multi-Provider Access",
    description:
      "Akses terkontrol per provider. 10 provider dengan Super Admin masing-masing. Data terisolasi dan aman.",
  },
] as const;

const STATS = [
  { value: 1000, suffix: "+", label: "Karyawan" },
  { value: 10, suffix: "", label: "Provider" },
  { value: 9, suffix: "", label: "Unit Organisasi" },
  { value: 7, suffix: "", label: "Chart Analitik" },
  { value: 1, suffix: "", label: "AI-Powered" },
] as const;

// ---------------------------------------------------------------------------
// Animated counter hook
// ---------------------------------------------------------------------------

function useCounter(target: number, inView: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame: number;
    const duration = 1500;
    const start = performance.now();

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, inView]);

  return count;
}

// ---------------------------------------------------------------------------
// Components
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
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-white/95 shadow-sm backdrop-blur-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/gapuraangkasa.jpg"
            alt="Gapura Angkasa"
            width={120}
            height={40}
            priority
            className="h-9 w-auto object-contain"
          />
          <span className="hidden text-lg font-bold text-foreground sm:inline">
            Kelola SDM
          </span>
        </Link>
        <Link
          href={ROUTES.LOGIN}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Masuk ke Sistem
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#439454]/5 via-[#439454]/[0.02] to-transparent" />
      {/* Decorative shapes */}
      <div className="absolute top-20 right-0 -z-10 h-[500px] w-[500px] translate-x-1/3 rounded-full bg-[#439454]/[0.04] blur-3xl" />
      <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] -translate-x-1/3 rounded-full bg-[#439454]/[0.03] blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Kelola SDM{" "}
            <span className="text-primary">Gapura Angkasa</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            Sistem Manajemen Sumber Daya Manusia internal PT Gapura Angkasa.
            Kelola data 1000+ karyawan dengan mudah, cepat, dan aman.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
          >
            <Link
              href={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30"
            >
              Masuk ke Sistem
              <ArrowRight className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={() => {
                document
                  .getElementById("fitur")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Pelajari Fitur
              <ChevronDown className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="bg-primary">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-3 md:gap-8 lg:grid-cols-5 lg:px-8 lg:py-12">
        {STATS.map((stat) => (
          <StatItem key={stat.label} stat={stat} inView={inView} />
        ))}
      </div>
    </section>
  );
}

function StatItem({
  stat,
  inView,
}: {
  stat: (typeof STATS)[number];
  inView: boolean;
}) {
  const count = useCounter(stat.value, inView);
  return (
    <div className="text-center">
      <p className="text-3xl font-extrabold text-white sm:text-4xl">
        {count}
        {stat.suffix}
      </p>
      <p className="mt-1 text-sm font-medium text-white/80">{stat.label}</p>
    </div>
  );
}

function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="fitur" className="scroll-mt-16 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-foreground sm:text-4xl"
          >
            Fitur Unggulan
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-3 max-w-xl text-muted-foreground"
          >
            Semua yang Anda butuhkan untuk mengelola data SDM secara efisien
          </motion.p>
        </div>

        <div
          ref={ref}
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
        >
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.1 * i }}
              className="group rounded-xl border border-border bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 sm:p-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-light">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompanySection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="bg-secondary/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              PT Gapura Angkasa
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              PT Gapura Angkasa adalah perusahaan ground handling yang
              beroperasi di Bandar Udara I Gusti Ngurah Rai, Bali. Melayani
              berbagai maskapai penerbangan dengan layanan berkualitas tinggi
              meliputi passenger handling, ramp handling, cargo handling, dan
              operasional bandara.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Bandara Ngurah Rai, Bali
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex justify-center"
          >
            <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
              <Image
                src="/images/gapuraangkasa.jpg"
                alt="PT Gapura Angkasa"
                width={360}
                height={120}
                className="h-auto w-full max-w-[320px] object-contain"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function InstallSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
            Install di Perangkat Anda
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            Install aplikasi ini ke home screen untuk akses lebih cepat dan
            pengalaman seperti aplikasi native.
          </p>
          <div className="mt-6">
            <InstallButton />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#111827] text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <h3 className="text-lg font-bold">Kelola SDM Gapura Angkasa</h3>
          <p className="mt-2 text-sm text-gray-400">
            Sistem Manajemen SDM Internal
          </p>
          <p className="mt-1 text-sm text-gray-400">
            PT Gapura Angkasa
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Bandar Udara I Gusti Ngurah Rai, Bali
          </p>

          <Link
            href={ROUTES.LOGIN}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
          >
            Masuk ke Sistem
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <div className="mt-8 border-t border-gray-700 pt-6 text-xs text-gray-500">
            &copy; 2026 PT Gapura Angkasa. Hak cipta dilindungi.
          </div>
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
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <CompanySection />
      <InstallSection />
      <Footer />
    </div>
  );
}
