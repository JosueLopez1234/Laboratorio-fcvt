import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function Encabezado({
  titulo,
  volver = false,
  children,
}: {
  titulo?: string;
  volver?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header>
      <div className="franja-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-uleam-horizontal.png" alt="ULEAM" className="logo" />
        <p className="facultad">Facultad de Ciencias de la Vida y Tecnología</p>
      </div>

      <div className="header-app flex flex-col gap-3">
        {(titulo || volver) && (
          <div className="flex items-center gap-3">
            {volver && (
              <Link href="/" aria-label="Volver">
                <ArrowLeft />
              </Link>
            )}
            {titulo && <h1 className="text-lg font-bold">{titulo}</h1>}
          </div>
        )}
        {children}
      </div>
    </header>
  );
}