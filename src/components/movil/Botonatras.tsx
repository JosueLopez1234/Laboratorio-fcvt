"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

export default function BotonAtras() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const sub = App.addListener("backButton", () => {
      // 1) Si una pantalla quiere manejarlo (paso anterior, cerrar modal), la dejamos
      const evento = new CustomEvent("atras-app", { cancelable: true });
      if (!window.dispatchEvent(evento)) return;

      // 2) En el dashboard, salir de la app
      if (pathname === "/" || pathname === "") {
        App.exitApp();
        return;
      }

      // 3) En cualquier otra pantalla, volver
      if (window.history.length > 1) router.back();
      else router.push("/");
    });

    return () => {
      sub.then((h) => h.remove());
    };
  }, [pathname, router]);

  return null;
}