import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose@5";

const cuenta = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!);
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function tokenGoogle() {
  const clave = await importPKCS8(cuenta.private_key, "RS256");
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(cuenta.client_email)
    .setSubject(cuenta.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(clave);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  return (await r.json()).access_token as string;
}

Deno.serve(async (req) => {
  const { record } = await req.json(); // fila nueva de notificaciones
  const { data: disp } = await admin
    .from("dispositivos").select("token").eq("usuario_id", record.usuario_id);
  if (!disp?.length) return new Response("sin dispositivos");

  const acceso = await tokenGoogle();
  for (const { token } of disp) {
    const r = await fetch(
      `https://fcm.googleapis.com/v1/projects/${cuenta.project_id}/messages:send`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${acceso}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: record.titulo, body: record.mensaje },
            data: { href: record.href ?? "/" },
          },
        }),
      },
    );
    // Token caducado o desinstalado: se limpia
    if (r.status === 404 || r.status === 400) {
      await admin.from("dispositivos").delete().eq("token", token);
    }
  }
  return new Response("ok");
});