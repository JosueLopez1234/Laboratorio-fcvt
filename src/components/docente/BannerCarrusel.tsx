"use client";
import { useEffect, useState } from "react";

export type Banner = { src: string; text: string };

/* Mismo carrusel del dashboard docente (clases dd-banner / dd-dots).
   Avanza solo cada 5 s y se puede deslizar en móvil. */
export default function BannerCarrusel({ banners }: { banners: Banner[] }) {
  const [actual, setActual] = useState(0);
  const [inicioX, setInicioX] = useState<number | null>(null);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => setActual((a) => (a + 1) % banners.length), 5000);
    return () => window.clearInterval(timer);
  }, [actual, banners.length]);

  const siguiente = () => setActual((a) => (a + 1) % banners.length);
  const anterior = () => setActual((a) => (a - 1 + banners.length) % banners.length);

  const alTocar = (e: React.TouchEvent) => setInicioX(e.touches[0].clientX);
  const alSoltar = (e: React.TouchEvent) => {
    if (inicioX === null) return;
    const dif = e.changedTouches[0].clientX - inicioX;
    if (Math.abs(dif) > 50) {
      if (dif < 0) siguiente();
      else anterior();
    }
    setInicioX(null);
  };

  return (
    <>
      <div
        className="dd-banner"
        role="region"
        aria-roledescription="carrusel"
        aria-label="Carrusel de imágenes"
        onTouchStart={alTocar}
        onTouchEnd={alSoltar}
      >
        {banners.map((b, i) => (
          <div
            key={b.src}
            className={`dd-banner__slide ${i === actual ? "is-active" : ""}`}
            style={{ backgroundImage: `url(${b.src})` }}
            aria-hidden={i !== actual}
          >
            <p className="dd-banner__text">{b.text}</p>
          </div>
        ))}
      </div>
      <div className="dd-dots" aria-label="Seleccionar imagen del carrusel">
        {banners.map((b, i) => (
          <button
            key={b.src}
            type="button"
            className={`dd-dot ${i === actual ? "is-active" : ""}`}
            aria-label={`Mostrar imagen ${i + 1}: ${b.text}`}
            aria-pressed={i === actual}
            onClick={() => setActual(i)}
          />
        ))}
      </div>
    </>
  );
}