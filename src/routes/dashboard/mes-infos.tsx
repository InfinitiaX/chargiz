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
  const { profile } = useAuth();
  const [vehicule, setVehicule] = useState<Record<string, unknown> | null>(null);
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [filialeNom, setFilialeNom] = useState("");
  const [siteNom, setSiteNom] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "", adresse: "", code_postal: "", ville: "" });
  const [politique, setPolitique] = useState({ cout_kwh_domicile: "" as string | number, jours_suivi: [] as string[] });
  const [politiqueDeleguee, setPolitiqueDeleguee] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({ nom: profile.nom, prenom: profile.prenom, telephone: profile.telephone || "", adresse: profile.adresse || "", code_postal: profile.code_postal || "", ville: profile.ville || "" });
    setPolitique({
      cout_kwh_domicile: profile.cout_kwh_domicile ?? "",
      jours_suivi: Array.isArray(profile.jours_suivi) ? profile.jours_suivi : [],
    });
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
    // Politique individuelle = délégation au collaborateur
    const { data: pol } = await supabase.from("politiques_recharge").select("id").eq("collaborateur_id", profile.id).limit(1).maybeSingle();
    setPolitiqueDeleguee(!!pol);
  }

  const handleSave = async () => {
    if (!profile) return;
    const updates: {
      nom: string; prenom: string; telephone: string; adresse: string; code_postal: string; ville: string;
      cout_kwh_domicile?: number | null; jours_suivi?: string[];
    } = { ...form };
    if (politiqueDeleguee) {
      updates.cout_kwh_domicile = politique.cout_kwh_domicile === "" ? null : Number(politique.cout_kwh_domicile);
      updates.jours_suivi = politique.jours_suivi;
    }
    await supabase.from("profiles").update(updates).eq("id", profile.id);
    setEditMode(false);
    window.location.reload();
  };

  const toggleJour = (j: string) => {
    setPolitique(p => ({
      ...p,
      jours_suivi: p.jours_suivi.includes(j) ? p.jours_suivi.filter(x => x !== j) : [...p.jours_suivi, j],
    }));
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const greyedCls = "w-full rounded-lg border border-input bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed";

  if (!profile) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Chargement...</div></div>;

  const jours = [
    { key: "lun", label: "Lun" }, { key: "mar", label: "Mar" }, { key: "mer", label: "Mer" },
    { key: "jeu", label: "Jeu" }, { key: "ven", label: "Ven" }, { key: "sam", label: "Sam" }, { key: "dim", label: "Dim" },
  ];

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
            {/* Champs grisés (non modifiables) */}
            <div>
              <label className="text-muted-foreground text-xs">Entreprise <span className="text-[10px] uppercase">(non modifiable)</span></label>
              <input value={entrepriseNom || "—"} disabled className={greyedCls} />
            </div>
            <div>
              <label className="text-muted-foreground text-xs">Filiale <span className="text-[10px] uppercase">(non modifiable)</span></label>
              <input value={filialeNom || "—"} disabled className={greyedCls} />
            </div>
            <div>
              <label className="text-muted-foreground text-xs">Site <span className="text-[10px] uppercase">(non modifiable)</span></label>
              <input value={siteNom || "—"} disabled className={greyedCls} />
            </div>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground"><Shield className="h-5 w-5 text-primary" /> Politique de recharge</h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${politiqueDeleguee ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-muted text-muted-foreground"}`}>
              {politiqueDeleguee ? "Délégué — modifiable" : "Géré par l'entreprise"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-muted-foreground text-xs">Coût kWh domicile (€)</label>
              {editMode && politiqueDeleguee ? (
                <input type="number" step="0.001" value={politique.cout_kwh_domicile}
                  onChange={e => setPolitique({ ...politique, cout_kwh_domicile: e.target.value })} className={inputCls} />
              ) : (
                <input value={profile.cout_kwh_domicile ? `${profile.cout_kwh_domicile} €` : "—"} disabled className={greyedCls} />
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-2">Jours de recharge éligibles</p>
              <div className="flex gap-1.5 flex-wrap">
                {jours.map(j => {
                  const active = editMode && politiqueDeleguee
                    ? politique.jours_suivi.includes(j.key)
                    : Array.isArray(profile.jours_suivi) && profile.jours_suivi.includes(j.key);
                  const clickable = editMode && politiqueDeleguee;
                  return (
                    <button key={j.key} type="button" disabled={!clickable}
                      onClick={() => clickable && toggleJour(j.key)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} ${clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}>
                      {j.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Véhicule */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground mb-4"><Car className="h-5 w-5 text-primary" /> Véhicule</h3>
          {vehicule ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
