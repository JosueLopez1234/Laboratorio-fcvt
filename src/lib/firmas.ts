import { supabase } from "@/lib/supabase";

export async function subirFirma(dataUrl: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión.");
  const blob = await (await fetch(dataUrl)).blob();
  const ruta = `${user.id}/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage.from("firmas").upload(ruta, blob, { contentType: "image/png" });
  if (error) throw error;
  return ruta; // se guarda en firma_url
}