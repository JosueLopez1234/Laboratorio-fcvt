import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/perfil/auth";
import AuthGate from "@/components/Perfil/AuthGate";
import PermisoNotificacionesGate from "@/components/notificaciones/PermisoNotificacionesGate";
import BotonAtras from "@/components/movil/Botonatras";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });

export const metadata: Metadata = { title: "Laboratorios FCVT" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={montserrat.variable}>
        <BotonAtras />
        <AuthProvider>
          <PermisoNotificacionesGate>
            <AuthGate>{children}</AuthGate>
          </PermisoNotificacionesGate>
        </AuthProvider>
      </body>
    </html>
  );
}