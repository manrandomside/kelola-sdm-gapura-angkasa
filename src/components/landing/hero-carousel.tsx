"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const SLIDES = [
  {
    src: "/images/hero/inagural.jpeg",
    alt: "Tim Gapura Angkasa siap melayani penerbangan di Bandar Udara Ngurah Rai",
  },
  {
    src: "/images/hero/inagural2.jpeg",
    alt: "Petugas ground handling Gapura Angkasa di apron",
  },
  {
    src: "/images/hero/inagural-indigo.jpeg",
    alt: "Inaugural ceremony rute Indigo di Bandar Udara Ngurah Rai",
  },
  {
    src: "/images/hero/inagural-indigo2.jpeg",
    alt: "Acara penyambutan penerbangan perdana Indigo",
  },
  {
    src: "/images/hero/inagural-sichuan.jpeg",
    alt: "Inaugural ceremony rute Sichuan Airlines",
  },
] as const;

export function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 30 }, [
    Autoplay({
      delay: 5000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={emblaRef} className="h-full">
        <div className="flex h-full">
          {SLIDES.map((slide, index) => (
            <div key={slide.src} className="relative h-full flex-[0_0_100%]">
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover object-center"
                quality={85}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Gradient overlays untuk legibility teks hero */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#2d5a37]/85 via-[#439454]/60 to-[#439454]/40" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

      {/* Tombol prev/next (desktop) */}
      <button
        type="button"
        onClick={scrollPrev}
        aria-label="Slide sebelumnya"
        className="absolute top-1/2 left-4 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/15 backdrop-blur-sm transition-all hover:bg-white/25 md:flex"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        aria-label="Slide berikutnya"
        className="absolute top-1/2 right-4 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/15 backdrop-blur-sm transition-all hover:bg-white/25 md:flex"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => scrollTo(index)}
            aria-label={`Slide ke-${index + 1}`}
            className={cn(
              "h-2 rounded-full transition-all",
              selectedIndex === index
                ? "w-8 bg-white"
                : "w-2 bg-white/50 hover:bg-white/70",
            )}
          />
        ))}
      </div>
    </div>
  );
}
