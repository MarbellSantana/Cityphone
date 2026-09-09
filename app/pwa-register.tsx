"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    const refreshKey = "cityphone-cache-reset-v1";

    const resetOldPwaCache = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }

        // Importante: no tocamos localStorage ni IndexedDB, así que los datos del sistema se conservan.
        if (!sessionStorage.getItem(refreshKey)) {
          sessionStorage.setItem(refreshKey, "1");
          window.location.reload();
        }
      } catch {
        // Si el navegador no permite limpiar alguna caché, la app continúa normalmente.
      }
    };

    void resetOldPwaCache();
  }, []);

  return null;
}
