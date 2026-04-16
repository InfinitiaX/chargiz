import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Building2, User, Shield, Save, Clock, Calendar, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/dashboard/reglages")({
  component: ReglagesPage,
  head: () => ({ meta: [{ title: "ChargiZ — Réglages" }] }),
});

function ReglagesPage() {
  const { profile, role, user } = useAuth();
  const [entreprise, setEntreprise] = useState<Record<string, string | number | null>>({});
  const [filiale, setFiliale] = useState<Record<string, string | null>>({});
  const [site, setSite] = useState<Record<string, string | null>>({});
  const [politique, setPolitique] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  // Politique fields
  const [prixKwh, setPrixKwh] = useState("0.21");
  const [joursAutorises, setJoursAutorises] = useState<string[]>(["lun", "mar", "mer", "jeu", "ven"]);
  const [heureDebut, setHeureDebut] = useState("00:00");
  const [heureFin, setHeureFin] = useState("23:59");
  const [congesNonRembourses, setCongesNonRembourses] = useState(true);
  const [fermetures, setFermetures] = useState<string[]>([]);
  const [newFermeture, setNewFermeture] = useState("");

  // Delegation level
  const [delegationPrix, setDelegationPrix] = useState("entreprise");
  const [delegationJours, setDelegationJours] = useState("entreprise");

  useEffect(() => {
    if (!profile?.entreprise_id) return;
    loadData();
  }, [profile?.entreprise_id]);

  async function loadData() {
    const { data: ent } = await supabase.from("entreprises").select("*").eq("id", profile!.entreprise_id!).single();
    if (ent) setEntreprise(ent);

    if (profile!.filiale_id) {
      const { data: fil } = await supabase.from("filiales").select("*").eq("id", profile!.filiale_id).single();
      if (fil) setFiliale(fil);
    }
    if (profile!.site_id) {
      const { data: s } = await supabase.from("sites").select("*").eq("id", profile!.site_id).single();
      if (s) setSite(s);
    }

    const { data: pol } = await supabase.from("politiques_recharge").select("*").eq("entreprise_id", profile!.entreprise_id!).limit(1).maybeSingle();
    if (pol) {
      setPolitique(pol);
      setPrixKwh(String(pol.prix_kwh || "0.21"));
      if (Array.isArray(pol.jours_autorises)) setJoursAutorises(pol.jours_autorises as string[]);
      setHeureDebut(String(pol.horaires_debut || "00:00"));
      setHeureFin(String(pol.horaires_fin || "23:59"));
      setCongesNonRembourses(pol.conges_non_rembourses !== false);
      if (Array.isArray(pol.fermetures)) setFermetures((pol.fermetures as string[]));
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
      conges_non_rembourses: congesNonRembourses,
      fermetures: fermetures,
    };

    if (politique && (politique as Record<string, unknown>).id) {
      await supabase.from("politiques_recharge").update(data).eq("id", (politique as Record<string, unknown>).id as string);
    } else {
      await supabase.from("politiques_recharge").insert(data);
    }
    setSaving(false);
    loadData();
  };

  const addFermeture = () => {
    if (newFermeture && !fermetures.includes(newFermeture)) {
      setFermetures([...fermetures, newFermeture]);
      setNewFermeture("");
    }
  };

  const jourLabels: Record<string, string> = { lun: "Lun", mar: "Mar", mer: "Mer", jeu: "Jeu", ven: "Ven", sam: "Sam", dim: "Dim" };
  const toggleJour = (j: string) => setJoursAutorises(prev => prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]);
  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  const isGestEntreprise = role === "gestionnaire_entreprise" || role === "admin" || role === "superadmin";
  const isGestFiliale = role === "gestionnaire_filiale";
  const isGestSite = role === "gestionnaire_site";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Réglages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paramètres de l'entreprise et politique de recharge</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Informations entreprise */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Informations entreprise</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><label className="text-muted-foreground text-xs">Dénomination</label><p className="mt-1 font-medium text-card-foreground">{(entreprise.nom as string) || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">SIREN</label><p className="mt-1 font-mono text-card-foreground">{(entreprise.siren as string) || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">SIRET</label><p className="mt-1 font-mono text-card-foreground">{(entreprise.siret as string) || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">N° TVA</label><p className="mt-1 text-card-foreground">{(entreprise.numero_tva as string) || "—"}</p></div>
              <div className="col-span-2"><label className="text-muted-foreground text-xs">Adresse</label><p className="mt-1 text-card-foreground">{[(entreprise.adresse as string), (entreprise.code_postal as string), (entreprise.ville as string)].filter(Boolean).join(", ") || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">Téléphone</label><p className="mt-1 text-card-foreground">{(entreprise.telephone as string) || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">Email</label><p className="mt-1 text-card-foreground">{(entreprise.email as string) || "—"}</p></div>
            </div>
          </div>
        </div>

        {/* Responsable section based on role */}
        {(isGestFiliale || isGestSite) && filiale.responsable_nom && (
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-card-foreground">Responsable filiale</h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><label className="text-muted-foreground text-xs">Nom</label><p className="mt-1 font-medium text-card-foreground">{filiale.responsable_nom || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">Prénom</label><p className="mt-1 text-card-foreground">{filiale.responsable_prenom || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">Téléphone</label><p className="mt-1 text-card-foreground">{filiale.responsable_telephone || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">Email</label><p className="mt-1 text-card-foreground">{filiale.responsable_email || "—"}</p></div>
            </div>
          </div>
        )}

        {isGestSite && site.responsable_nom && (
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-card-foreground">Responsable site</h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><label className="text-muted-foreground text-xs">Nom</label><p className="mt-1 font-medium text-card-foreground">{site.responsable_nom || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">Prénom</label><p className="mt-1 text-card-foreground">{site.responsable_prenom || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">Téléphone</label><p className="mt-1 text-card-foreground">{site.responsable_telephone || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">Email</label><p className="mt-1 text-card-foreground">{site.responsable_email || "—"}</p></div>
            </div>
          </div>
        )}

        {/* Mon compte */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Mon compte</h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4 text-sm">
            <div><label className="text-muted-foreground text-xs">Nom</label><p className="mt-1 text-card-foreground">{profile?.nom} {profile?.prenom}</p></div>
            <div><label className="text-muted-foreground text-xs">Email</label><p className="mt-1 text-card-foreground">{profile?.email || user?.email}</p></div>
            <div><label className="text-muted-foreground text-xs">Rôle</label><p className="mt-1 capitalize text-card-foreground">{role?.replace(/_/g, " ") || "—"}</p></div>
            <div><label className="text-muted-foreground text-xs">Téléphone</label><p className="mt-1 text-card-foreground">{profile?.telephone || "—"}</p></div>
          </div>
        </div>

        {/* Politique de recharge */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Politique de recharge</h3>
          </div>
          <div className="p-6 space-y-6">
            {/* Delegation info */}
            {isGestEntreprise && (
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Délégation en cascade</p>
                <p>Chaque paramètre peut être géré au niveau entreprise, filiale, site ou collaborateur. Les niveaux inférieurs héritent de la valeur du niveau supérieur sauf si redéfinie.</p>
              </div>
            )}

            {/* Prix kWh */}
            <div>
              <label className="text-sm font-medium text-foreground">1. Prix du kWh (€ TTC)</label>
              <p className="text-xs text-muted-foreground mb-2">Seul paramètre configurable par le collaborateur via le lien d'inscription</p>
              <input type="number" step="0.0001" value={prixKwh} onChange={e => setPrixKwh(e.target.value)} className={`mt-1 ${inputCls} max-w-xs`} />
            </div>

            {/* Jours & horaires */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">2. Jours & horaires éligibles</label>
              <p className="text-xs text-muted-foreground mb-3">Non disponible via le lien d'inscription — espace connecté uniquement</p>
              <div className="flex gap-2 mb-4">
                {Object.entries(jourLabels).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => toggleJour(key)}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${joursAutorises.includes(key) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Début</label>
                  <input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} className={`mt-1 ${inputCls}`} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Fin</label>
                  <input type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)} className={`mt-1 ${inputCls}`} />
                </div>
              </div>
            </div>

            {/* Fermetures */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">3. Dates de fermeture entreprise</label>
              <p className="text-xs text-muted-foreground mb-3">Gérées uniquement par entreprise / filiale / site — jamais par le collaborateur</p>
              <div className="flex gap-2 mb-3">
                <input type="date" value={newFermeture} onChange={e => setNewFermeture(e.target.value)} className={`${inputCls} max-w-xs`} />
                <button onClick={addFermeture} className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80">Ajouter</button>
              </div>
              {fermetures.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {fermetures.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive">
                      {new Date(f).toLocaleDateString("fr-FR")}
                      <button onClick={() => setFermetures(fermetures.filter((_, j) => j !== i))} className="ml-1 hover:text-destructive-foreground">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Congés */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">4. Gestion des congés</label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!congesNonRembourses} onChange={e => setCongesNonRembourses(!e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary" />
                <span className="text-sm text-foreground">Rembourser les recharges pendant les congés</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                {congesNonRembourses
                  ? "Les recharges effectuées pendant les congés déclarés sont automatiquement exclues du remboursement."
                  : "Les recharges pendant les congés seront remboursées normalement."
                }
              </p>
            </div>

            <button onClick={savePolitique} disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Appliquer la politique"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
