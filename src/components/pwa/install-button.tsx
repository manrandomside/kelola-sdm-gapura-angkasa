"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type Platform = "ios" | "android" | "desktop";

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      setShowManualGuide(true);
    }
  }

  if (isInstalled) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Smartphone className="size-4" />
        Aplikasi sudah ter-install di perangkat Anda
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleInstall}
        className="inline-flex items-center gap-2 rounded-xl border-2 border-primary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
      >
        <Download className="size-5" />
        Install Aplikasi
      </button>

      {showManualGuide && (
        <div className="max-w-md rounded-lg border border-blue-200 bg-blue-50 p-4 text-left text-sm text-blue-900">
          {platform === "ios" && (
            <div>
              <p className="mb-2 font-semibold">
                Cara install di iPhone/iPad:
              </p>
              <ol className="list-inside list-decimal space-y-1">
                <li>Tap tombol Share (kotak dengan panah atas)</li>
                <li>Scroll dan tap &quot;Add to Home Screen&quot;</li>
                <li>Tap &quot;Add&quot; di pojok kanan atas</li>
              </ol>
            </div>
          )}
          {platform === "android" && (
            <div>
              <p className="mb-2 font-semibold">Cara install di Android:</p>
              <ol className="list-inside list-decimal space-y-1">
                <li>Tap menu (3 titik) di browser</li>
                <li>
                  Pilih &quot;Install app&quot; atau &quot;Add to Home
                  screen&quot;
                </li>
                <li>Konfirmasi install</li>
              </ol>
            </div>
          )}
          {platform === "desktop" && (
            <div>
              <p className="mb-2 font-semibold">Cara install di Desktop:</p>
              <ol className="list-inside list-decimal space-y-1">
                <li>Klik ikon install di address bar (Chrome/Edge)</li>
                <li>
                  Atau menu browser &rarr; &quot;Install Kelola SDM...&quot;
                </li>
              </ol>
              <p className="mt-2 text-xs">
                Catatan: Pastikan Anda membuka halaman ini di Chrome atau Edge.
                Firefox dan Safari tidak mendukung install PWA di desktop.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
