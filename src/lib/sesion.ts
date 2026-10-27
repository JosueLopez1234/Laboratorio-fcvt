import { supabase } from "@/lib/supabase";

/** Id del usuario que inició sesión. */
export async function usuarioId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión.");
  return user.id;
}