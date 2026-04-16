import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password = "ChargiZ2026!";
  const entrepriseId = "a1b2c3d4-0000-0000-0000-000000000001";

  const accounts = [
    { email: "superadmin@chargiz.fr", role: "superadmin", nom: "Benmoussa", prenom: "Karim", filiale_id: null, site_id: null },
    { email: "admin@chargiz.fr", role: "admin", nom: "Martin", prenom: "Sophie", filiale_id: null, site_id: null },
    { email: "gestionnaire@chargiz.fr", role: "gestionnaire_entreprise", nom: "Dupont", prenom: "Marie", filiale_id: null, site_id: null },
    { email: "gest.filiale@chargiz.fr", role: "gestionnaire_filiale", nom: "Durand", prenom: "Pierre", filiale_id: "f1000001-aaaa-bbbb-cccc-000000000001", site_id: null },
    { email: "gest.site@chargiz.fr", role: "gestionnaire_site", nom: "Girard", prenom: "Nicolas", filiale_id: "f1000001-aaaa-bbbb-cccc-000000000002", site_id: "a3aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
    { email: "conducteur@chargiz.fr", role: "collaborateur", nom: "Bonnet", prenom: "Laura", filiale_id: "f1000001-aaaa-bbbb-cccc-000000000001", site_id: "a1aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
  ];

  const results = [];

  for (const acc of accounts) {
    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === acc.email);

    let userId: string;

    if (existing) {
      // Update password
      const { error } = await supabase.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
      userId = existing.id;
      results.push({ email: acc.email, action: "password_updated", error: error?.message });
    } else {
      // Create user
      const { data, error } = await supabase.auth.admin.createUser({
        email: acc.email,
        password,
        email_confirm: true,
        user_metadata: { nom: acc.nom, prenom: acc.prenom },
      });
      if (error || !data.user) {
        results.push({ email: acc.email, action: "create_failed", error: error?.message });
        continue;
      }
      userId = data.user.id;
      results.push({ email: acc.email, action: "created", userId });
    }

    // Upsert profile
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfile) {
      await supabase.from("profiles").update({
        nom: acc.nom,
        prenom: acc.prenom,
        email: acc.email,
        entreprise_id: entrepriseId,
        filiale_id: acc.filiale_id,
        site_id: acc.site_id,
      }).eq("user_id", userId);
    } else {
      await supabase.from("profiles").insert({
        user_id: userId,
        nom: acc.nom,
        prenom: acc.prenom,
        email: acc.email,
        entreprise_id: entrepriseId,
        filiale_id: acc.filiale_id,
        site_id: acc.site_id,
      });
    }

    // Upsert role
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingRole) {
      await supabase.from("user_roles").update({ role: acc.role }).eq("user_id", userId);
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: acc.role });
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
