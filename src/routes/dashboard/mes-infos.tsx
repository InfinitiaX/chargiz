import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { User, Car, Shield, Save } from "lucide-react";

export const Route = createFileRoute("/dashboard/mes-infos")({
  component: MesInfosPage,
  head: () => ({ meta: [{ title: "ChargiZ — Mes informations" }] }),
});

function MesInfosPage() {
  const { profile, role } = useAuth();
  const [vehicule, setVehicule] = useState<Record<string, unknown> | null>(null);
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [filialeNom, setFilialeNom] = useState("");
  const [siteNom, setSiteNom] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "", adresse: "", code_postal: "", ville: "" });

  useEffect(() => {
    if (!profile) return;
    setForm({ nom: profile.nom, prenom: profile.prenom, telephone: profile.telephone || "", adresse: profile.adresse || "", code_postal: profile.code_postal || "", ville: profile.ville || "" });
    loadExtras();
  }, [profile]);

  async function loadExtras() {
    if (!profile) return;
    if (profile.entreprise_id) {
      const { data } = await supabase.from("entreprises").select("nom").eq("id", profile.entreprise_id).single();
      if (data) setEntrepriseNom(data.nom);
    }
    if (profile.filiale_id) {
      const { data } = await supabase.from("filiales").select("nom").eq("id", profile.filiale_id).single();
      if (data) setFilialeNom(data.nom);
    }
    if (profile.site_id) {
      const { data } = await supabase.from("sites").select("nom").eq("id", profile.site_id).single();
      if (data) setSiteNom(data.nom);
    }
    const { data: v } = await supabase.from("vehicules").select("*").eq("collaborateur_id", profile.id).limit(1).maybeSingle();
    if (v) setVehicule(v);
  }

  const handleSave = async () => {
    if (!profile) return;
    await supabase.from("profiles").update(form).eq("id", profile.id);
    setEditMode(false);
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  if (!profile) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Chargement...</div></div>;

  const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mes informations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez vos informations personnelles et véhicule</p>
        </div>
        {!editMode && (
          <button onClick={() => setEditMode(true)} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Modifier</button>
        )}
      </div>

      <div className="space-y-6">
        {/* Informations personnelles */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground mb-4"><User className="h-5 w-5 text-primary" /> Informations personnelles</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {editMode ? (
              <>
                <div><label className="text-muted-foreground text-xs">Nom</label><input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className={inputCls} /></div>
                <div><label className="text-muted-foreground text-xs">Prénom</label><input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className={inputCls} /></div>
                <div><label className="text-muted-foreground text-xs">Téléphone</label><input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className={inputCls} /></div>
                <div><label className="text-muted-foreground text-xs">Adresse</label><input value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} className={inputCls} /></div>
                <div><label className="text-muted-foreground text-xs">Code postal</label><input value={form.code_postal} onChange={e => setForm({ ...form, code_postal: e.target.value })} className={inputCls} /></div>
                <div><label className="text-muted-foreground text-xs">Ville</label><input value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })} className={inputCls} /></div>
              </>
            ) : (
              <>
                <div><p className="text-muted-foreground">Nom</p><p className="font-medium text-card-foreground">{profile.nom}</p></div>
                <div><p className="text-muted-foreground">Prénom</p><p className="font-medium text-card-foreground">{profile.prenom}</p></div>
                <div><p className="text-muted-foreground">Email</p><p className="font-medium text-card-foreground">{profile.email}</p></div>
                <div><p className="text-muted-foreground">Téléphone</p><p className="font-medium text-card-foreground">{profile.telephone || "—"}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Adresse</p><p className="font-medium text-card-foreground">{[profile.adresse, profile.code_postal, profile.ville].filter(Boolean).join(", ") || "—"}</p></div>
              </>
            )}
            <div><p className="text-muted-foreground">Entreprise</p><p className="font-medium text-card-foreground opacity-60">{entrepriseNom || "—"}</p></div>
            <div><p className="text-muted-foreground">Filiale</p><p className="font-medium text-card-foreground opacity-60">{filialeNom || "—"}</p></div>
            <div><p className="text-muted-foreground">Site</p><p className="font-medium text-card-foreground opacity-60">{siteNom || "—"}</p></div>
          </div>
          {editMode && (
            <div className="mt-4 flex gap-2">
              <button onClick={handleSave} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light"><Save className="h-4 w-4" /> Enregistrer</button>
              <button onClick={() => setEditMode(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Annuler</button>
            </div>
          )}
        </div>

        {/* Politique de recharge */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground mb-4"><Shield className="h-5 w-5 text-primary" /> Politique de recharge</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Coût kWh domicile</p><p className="font-medium text-card-foreground">{profile.cout_kwh_domicile ? `${profile.cout_kwh_domicile} €` : "—"}</p></div>
            <div>
              <p className="text-muted-foreground mb-2">Jours de suivi</p>
              <div className="flex gap-1.5">
                {jours.map(j => {
                  const active = Array.isArray(profile.jours_suivi) && profile.jours_suivi.includes(j.toLowerCase());
                  return <span key={j} className={`rounded-md px-2 py-0.5 text-xs font-medium ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{j}</span>;
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Véhicule */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground mb-4"><Car className="h-5 w-5 text-primary" /> Véhicule</h3>
          {vehicule ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Marque</p><p className="font-medium text-card-foreground">{(vehicule.marque as string) || "—"}</p></div>
              <div><p className="text-muted-foreground">Modèle</p><p className="font-medium text-card-foreground">{(vehicule.modele as string) || "—"}</p></div>
              <div><p className="text-muted-foreground">Immatriculation</p><p className="font-medium font-mono text-card-foreground">{(vehicule.immatriculation as string) || "—"}</p></div>
              <div><p className="text-muted-foreground">VIN</p><p className="font-medium font-mono text-xs text-card-foreground">{(vehicule.vin as string) || "—"}</p></div>
              <div><p className="text-muted-foreground">Capacité batterie</p><p className="font-medium text-card-foreground">{vehicule.capacite_batterie ? `${vehicule.capacite_batterie} kWh` : "—"}</p></div>
              <div><p className="text-muted-foreground">Affectation</p><p className="font-medium text-card-foreground capitalize">{((vehicule.statut_affectation as string) || "").replace("_", " ")}</p></div>
              <div>
                <p className="text-muted-foreground">Statut connexion</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${(vehicule.statut_smartcar as string) === "connecte" ? "text-chargiz-teal" : "text-muted-foreground"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${(vehicule.statut_smartcar as string) === "connecte" ? "bg-chargiz-teal" : "bg-muted-foreground"}`} />
                  {(vehicule.statut_smartcar as string) === "connecte" ? "Connecté" : (vehicule.statut_smartcar as string) === "suspendu" ? "Suspendu" : "Déconnecté"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun véhicule affecté.</p>
          )}
        </div>
      </div>
    </div>
  );
}
