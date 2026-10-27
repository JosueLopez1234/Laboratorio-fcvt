import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/lib/supabase";

let activo = false;
let tokenActual = "";

export async function registrarPush() {
  if (!Capacitor.isNativePlatform() || activo) return;
  activo = true;
  try {
    let permiso = (await PushNotifications.checkPermissions()).receive;
    if (permiso.startsWith("prompt")) permiso = (await PushNotifications.requestPermissions()).receive;
    if (permiso !== "granted") { activo = false; return; }

    await PushNotifications.addListener("registration", async (t) => {
      tokenActual = t.value;
      await supabase.rpc("registrar_dispositivo", { p_token: t.value });
    });
    await PushNotifications.addListener("registrationError", (e) => console.error("Push:", e));
    await PushNotifications.register();
  } catch (e) {
    activo = false;
    console.error(e);
  }
}

/** Llámala ANTES de supabase.auth.signOut() */
export async function quitarPush() {
  if (!Capacitor.isNativePlatform()) return;
  if (tokenActual) await supabase.rpc("quitar_dispositivo", { p_token: tokenActual });
  await PushNotifications.removeAllListeners();
  tokenActual = "";
  activo = false;
}