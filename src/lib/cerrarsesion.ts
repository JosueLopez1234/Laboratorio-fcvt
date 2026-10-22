import { supabase } from "@/lib/supabase";

export async function cerrarSesion() {
  try {
    await supabase.auth.signOut({ scope: "local" }); // borra la sesión del dispositivo sin depender de la red
  } finally {
    window.location.replace("/login/");              // recarga limpia (con la barra final por el export estático)
  }
}