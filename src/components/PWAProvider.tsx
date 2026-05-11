"use client";

import { useServiceWorker, PWAInstallPrompt } from "@/components/PWAInstallPrompt";

export default function PWAProvider() {
  useServiceWorker();
  return <PWAInstallPrompt />;
}
