import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Building2, User, Shield, CreditCard, Save, Clock } from "lucide-react";

export const Route = createFileRoute("/dashboard/reglages")({
  component: ReglagesPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Réglages" },
      { name: "description", content: "Paramètres de votre espace ChargiZ." },
    ],
  }),
});

function ReglagesPage() {
  const { profile, role, user } = useAuth();
  const [entreprise, setEntreprise] = useState<Record<string, string | number | null>>({});
  const [politique, setPolitique] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [prixKwh, setPrixKwh] = useState("0.21");
  const [joursAutorises, setJoursAutorises] = useState<string[]>(["lun", "mar", "mer", "jeu", "ven"]);
  const [heureDebut, setHeureDebut] = useState("00:00");
  const [heureFin, setHeureFin] = useState("23:59");

  useEffect(() => {
    if (!profile?.entreprise_id) return;
    loadData();
  }, [profile?.entreprise_id]);

  async function loadData() {
    const { data: ent } = await supabase.from("entreprises").select("*").eq("id", profile!.entreprise_id!).single();
    if (ent) setEntreprise(ent);

    const { data: pol } = await supabase.from("politiques_recharge").select("*").eq("entreprise_id", profile!.entreprise_id!).limit(1).maybeSingle();
    if (pol) {
      setPolitique(pol);
      setPrixKwh(String(pol.prix_kwh || "0.21"));
      if (Array.isArray(pol.jours_autorises)) setJoursAutorises(pol.jours_autorises as string[]);
      setHeureDebut(String(pol.horaires_debut || "00:00"));
      setHeureFin(String(pol.horaires_fin || "23:59"));
    }
  }

  const savePolitique = async () => {
    setSaving(true);
    const data = {
      entreprise_id: profile!.entreprise_id!,
      prix_kwh: parseFloat(prixKwh),
      jours_autorises: joursAutorises,
      horaires_debut: heureDebut,
      horaires_fin: heureFin,
    };

    if (politique && (politique as Record<string, unknown>).id) {
      await supabase.from("politiques_recharge").update(data).eq("id", (politique as Record<string, unknown>).id);
    } else {
      await supabase.from("politiques_recharge").insert(data);
    }
    setSaving(false);
    loadData();
  };

  const jourLabels: Record<string, string> = { lun: "Lun", mar: "Mar", mer: "Mer", jeu: "Jeu", ven: "Ven", sam: "Sam", dim: "Dim" };
  const toggleJour = (j: string) => {
    setJoursAutorises(prev => prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]);
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Réglages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paramètres de l'entreprise et du compte</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Informations entreprise */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Informations entreprise</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Raison sociale</label>
                <p className="mt-1 text-sm text-card-foreground">{(entreprise.nom as string) || "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">SIREN</label>
                <p className="mt-1 text-sm font-mono text-card-foreground">{(entreprise.siren as string) || "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">SIRET</label>
                <p className="mt-1 text-sm font-mono text-card-foreground">{(entreprise.siret as string) || "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">N° TVA</label>
                <p className="mt-1 text-sm text-card-foreground">{(entreprise.numero_tva as string) || "—"}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                <p className="mt-1 text-sm text-card-foreground">
                  {[(entreprise.adresse as string), (entreprise.code_postal as string), (entreprise.ville as string)].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Compte */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Mon compte</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nom</label>
                <p className="mt-1 text-sm text-card-foreground">{profile?.nom} {profile?.prenom}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="mt-1 text-sm text-card-foreground">{profile?.email || user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Rôle</label>
                <p className="mt-1 text-sm text-card-foreground capitalize">{role?.replace(/_/g, " ") || "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                <p className="mt-1 text-sm text-card-foreground">{profile?.telephone || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Politique de recharge */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Politique de recharge</h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground">Prix du kWh (€ TTC)</label>
              <input type="number" step="0.0001" value={prixKwh} onChange={e => setPrixKwh(e.target.value)} className={`mt-1 ${inputCls} max-w-xs`} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Jours autorisés</label>
              <div className="flex gap-2">
                {Object.entries(jourLabels).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => toggleJour(key)}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${joursAutorises.includes(key) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Heure début</label>
                <input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Heure fin</label>
                <input type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)} className={`mt-1 ${inputCls}`} />
              </div>
            </div>

            <button onClick={savePolitique} disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer la politique"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
