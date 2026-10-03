import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const body = await req.json();
    if (clean(body.website, 200)) return json({ ok: true });

    const name = clean(body.name, 120);
    const company = clean(body.company, 160);
    const email = clean(body.email, 254).toLowerCase();
    const phone = clean(body.phone, 50);
    const subject = clean(body.subject, 160);
    const message = clean(body.message, 5000);

    if (name.length < 2 || message.length < 5 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Merci de vérifier votre nom, votre e-mail et votre message." }, 400);
    }

    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const secretKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!secretKey) throw new Error("Configuration serveur Supabase manquante");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: insertError } = await supabase.from("contact_requests").insert({
      name, company, email, phone, subject, message, status: "new",
    });
    if (insertError) throw insertError;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const { data: settings } = await supabase.from("site_settings").select("email").eq("id", 1).maybeSingle();
      const recipient = clean(Deno.env.get("CONTACT_TO_EMAIL") || settings?.email || "contact@traitdepice.fr", 254);
      const safeSubject = subject || "Nouvelle demande Trait d'Épice";
      const text = [
        `Nom : ${name}`,
        `Entreprise : ${company || "—"}`,
        `E-mail : ${email}`,
        `Téléphone : ${phone || "—"}`,
        `Objet : ${safeSubject}`,
        "",
        message,
      ].join("\n");

      const mailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("CONTACT_FROM_EMAIL") || "Trait d'Épice <onboarding@resend.dev>",
          to: [recipient],
          reply_to: email,
          subject: safeSubject,
          text,
        }),
      });
      if (!mailResponse.ok) console.error("Resend error", mailResponse.status, await mailResponse.text());
    }

    return json({ ok: true, message: "Votre demande a bien été envoyée." });
  } catch (error) {
    console.error(error);
    return json({ error: "Impossible d'envoyer votre demande pour le moment." }, 500);
  }
});
