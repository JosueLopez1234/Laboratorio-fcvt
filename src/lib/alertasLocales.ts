import { Capacitor } from "@capacitor/core";

export type PermisoAlertas = "concedido" | "denegado" | "pendiente" | "no-disponible";

const esNativo = () => Capacitor.isNativePlatform();

export async function estadoPermiso(): Promise<PermisoAlertas> {
  try {
    if (esNativo()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const { display } = await LocalNotifications.checkPermissions();
      return display === "granted" ? "concedido" : display === "denied" ? "denegado" : "pendiente";
    }
    if (typeof Notification === "undefined") return "no-disponible";
    return Notification.permission === "granted"
      ? "concedido"
      : Notification.permission === "denied"
        ? "denegado"
        : "pendiente";
  } catch {
    return "no-disponible";
  }
}

export async function pedirPermiso(): Promise<PermisoAlertas> {
  try {
    if (esNativo()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const { display } = await LocalNotifications.requestPermissions();
      return display === "granted" ? "concedido" : "denegado";
    }
    if (typeof Notification === "undefined") return "no-disponible";
    const r = await Notification.requestPermission();
    return r === "granted" ? "concedido" : r === "denied" ? "denegado" : "pendiente";
  } catch {
    return "no-disponible";
  }
}

/* Programa una alerta local dentro de `segundos` segundos. */
export async function programarAlerta(titulo: string, cuerpo: string, segundos: number) {
  if (esNativo()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 2_000_000_000),
          title: titulo,
          body: cuerpo,
          schedule: { at: new Date(Date.now() + segundos * 1000), allowWhileIdle: true },
        },
      ],
    });
    return;
  }
  // Respaldo para el navegador (solo funciona con la pestaña abierta)
  window.setTimeout(() => new Notification(titulo, { body: cuerpo }), segundos * 1000);
}

export const esApp = esNativo;

/* Abre los ajustes de la app en el teléfono (para activar las notificaciones a mano). */
export async function abrirAjustes() {
  if (!esNativo()) return;
  const { NativeSettings, AndroidSettings, IOSSettings } = await import("capacitor-native-settings");
  await NativeSettings.open({
    optionAndroid: AndroidSettings.ApplicationDetails,
    optionIOS: IOSSettings.App,
  });
}