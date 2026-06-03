/**
 * PolitiqueAvanceeSection — Étape 4 Lot 2.
 *
 * Bloc de configuration avancée de la politique de recharge au niveau ENTREPRISE
 * (CDC §3.3.2). Couvre :
 *  - Tarif flat ou HP/HC avec prix associés
 *  - Plages horaires HP/HC par jour de semaine (via HorairePicker)
 *  - Jours de fermeture par dates calendaires (via FermeturesCalendar)
 *  - Niveaux de délégation par dimension (prix / horaires / fermetures / congés)
 *
 * Backend : `POST /api/politiques` accepte tous les nouveaux champs et les
 * mêle aux anciens (delegation_prix, jours_fermeture bitmask) sans casser
 * la rétro-compatibilité Lot 1.
 */
import { useEffect, useState } from "react";
import { Save, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import HorairePicker, { type Plage } from "@/components/HorairePicker";
import FermeturesCalendar from "@/components/FermeturesCalendar";

interface Politique {
  id?: string;
  entreprise_id: string;
  prix_kwh: number | null;
  devise: string;
  jours_fermeture: number | null;
  delegation_prix: string;
  delegation_jours: string;
  niveau_prix: string;
  niveau_horaires: string;
  niveau_fermetures: string;
  niveau_conges: string;
  tarif_type: string | null;
  tarif_hp: number | null;
  tarif_hc: number | null;
  plages_hp: Plage[] | null;
  plages_hc: Plage[] | null;
  jours_fermeture_dates: string[] | null;
}

type TabId = "prix" | "horaires" | "fermetures" | "delegation";

interface Props {
  entrepriseId: string;
}

const NIVEAUX = ["entreprise", "filiale", "site", "collaborateur"] as const;
const NIVEAU_LABEL: Record<string, string> = {
  entreprise: "Entreprise",
  filiale: "Filiale",
  site: "Site",
  collaborateur: "Collaborateur",
};

export default function PolitiqueAvanceeSection({ entrepriseId }: Props) {
  const [tab, setTab] = useState<TabId>("prix");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pol, setPol] = useState<Politique | null>(null);

  useEffect(() => {
    if (!entrepriseId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const pols = await apiFetch<Politique[]>(`/api/politiques?entreprise_id=${entrepriseId}`);
        if (cancelled) return;
        const p = pols[0] || {
          entreprise_id: entrepriseId,
          prix_kwh: 0.21,
          devise: "EUR",
          jours_fermeture: 0,
          delegation_prix: "entreprise",
          delegation_jours: "entreprise",
          niveau_prix: "entreprise",
          niveau_horaires: "entreprise",
          niveau_fermetures: "entreprise",
          niveau_conges: "collaborateur",
          tarif_type: null,
          tarif_hp: null,
          tarif_hc: null,
          plages_hp: null,
          plages_hc: null,
          jours_fermeture_dates: null,
        };
        setPol(p);
      } catch (err) {
        console.error("Erreur chargement politique", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [entrepriseId]);

  if (loading || !pol) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm italic text-muted-foreground">Chargement de la politique avancée…</p>
      </div>
    );
  }

  const patch = (p: Partial<Politique>) => setPol({ ...pol, ...p });

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch<Politique>("/api/politiques", {
        method: "POST",
        body: JSON.stringify({
          // Champs Lot 1 (rétro-compat)
          entreprise_id: pol.entreprise_id,
          prix_kwh: pol.prix_kwh,
          devise: pol.devise || "EUR",
          jours_fermeture: pol.jours_fermeture ?? 0,
          delegation_prix: pol.delegation_prix,
          delegation_jours: pol.delegation_jours,
          // Champs Étape 4 Lot 2
          niveau_prix: pol.niveau_prix,
          niveau_horaires: pol.niveau_horaires,
          niveau_fermetures: pol.niveau_fermetures,
          niveau_conges: pol.niveau_conges,
          tarif_type: pol.tarif_type,
          tarif_hp: pol.tarif_hp,
          tarif_hc: pol.tarif_hc,
          plages_hp: pol.plages_hp || [],
          plages_hc: pol.plages_hc || [],
          jours_fermeture_dates: pol.jours_fermeture_dates || [],
        }),
      });
      toast.success("Politique avancée enregistrée.");
    } catch (err: any) {
      toast.error("Échec de l'enregistrement", { description: err?.message || "Réessayez plus tard." });
    } finally {
      setSaving(false);
    }
  };

  const tarifHpHc = pol.tarif_type === "hp_hc";

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-card-foreground">Politique avancée</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tarification HP/HC, fermetures par date et délégation hiérarchique 4 niveaux.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/30 px-4">
        {([
          { id: "prix", label: "Tarif" },
          { id: "horaires", label: "Horaires HP/HC" },
          { id: "fermetures", label: "Fermetures" },
          { id: "delegation", label: "Délégation" },
        ] as { id: TabId; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-6 p-6">
        {tab === "prix" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Type de tarification</label>
              <p className="mb-2 text-xs text-muted-foreground">
                Flat = un prix unique par kWh. HP/HC = prix différencié selon l'heure (calcul prorata temporis).
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => patch({ tarif_type: "flat" })}
                  className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                    !tarifHpHc ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}
                >
                  <p className="text-sm font-semibold text-card-foreground">Flat (un seul prix)</p>
                  <p className="mt-1 text-xs text-muted-foreground">Comportement Lot 1 — un prix kWh unique.</p>
                </button>
                <button
                  type="button"
                  onClick={() => patch({ tarif_type: "hp_hc" })}
                  className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                    tarifHpHc ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}
                >
                  <p className="text-sm font-semibold text-card-foreground">HP / HC</p>
                  <p className="mt-1 text-xs text-muted-foreground">Tarification heures pleines / creuses.</p>
                </button>
              </div>
            </div>

            {tarifHpHc && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">Tarif heures pleines (€ / kWh)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pol.tarif_hp ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(",", ".");
                      if (raw === "") { patch({ tarif_hp: null }); return; }
                      if (!/^\d*(\.\d{0,3})?$/.test(raw)) return;
                      patch({ tarif_hp: parseFloat(raw) || null });
                    }}
                    placeholder="0,25"
                    className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tarif heures creuses (€ / kWh)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pol.tarif_hc ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(",", ".");
                      if (raw === "") { patch({ tarif_hc: null }); return; }
                      if (!/^\d*(\.\d{0,3})?$/.test(raw)) return;
                      patch({ tarif_hc: parseFloat(raw) || null });
                    }}
                    placeholder="0,12"
                    className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:border-chargiz-teal focus:ring-2 focus:ring-chargiz-teal/20"
                  />
                </div>
              </div>
            )}

            {tarifHpHc && (
              <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Les plages horaires HP/HC sont configurées dans l'onglet « Horaires HP/HC ». Si une session
                couvre les deux périodes, l'énergie est répartie au prorata temporis.
              </p>
            )}
          </div>
        )}

        {tab === "horaires" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Définissez les plages heures pleines et heures creuses pour chaque jour de la semaine.
              Une plage où « fin » est antérieure à « début » traverse minuit (ex : 22h00 → 06h00).
            </p>
            <HorairePicker
              label="Plages heures pleines (tarif HP)"
              accent="hp"
              value={pol.plages_hp || []}
              onChange={(p) => patch({ plages_hp: p })}
            />
            <HorairePicker
              label="Plages heures creuses (tarif HC)"
              accent="hc"
              value={pol.plages_hc || []}
              onChange={(p) => patch({ plages_hc: p })}
            />
          </div>
        )}

        {tab === "fermetures" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Dates calendaires de fermeture (jours fériés, ponts, fermetures exceptionnelles). Les sessions
              de recharge à ces dates ne seront pas remboursées.
            </p>
            <FermeturesCalendar
              value={pol.jours_fermeture_dates || []}
              onChange={(v) => patch({ jours_fermeture_dates: v })}
            />
          </div>
        )}

        {tab === "delegation" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Le « niveau » indique jusqu'où la décision peut être déléguée. Exemple : si <em>niveau_prix = site</em>,
                la filiale puis le site peuvent surcharger le prix, mais le collaborateur ne peut pas (son override
                est ignoré).
              </p>
            </div>
            {([
              { key: "niveau_prix", label: "Prix kWh", help: "Qui peut décider du prix ?" },
              { key: "niveau_horaires", label: "Horaires HP/HC", help: "Qui définit les plages HP/HC ?" },
              { key: "niveau_fermetures", label: "Fermetures", help: "Qui décide des jours/dates de fermeture ?" },
              { key: "niveau_conges", label: "Congés", help: "Qui gère les congés individuels ?" },
            ] as { key: keyof Politique; label: string; help: string }[]).map((field) => {
              const current = (pol as any)[field.key] as string;
              return (
                <div key={field.key as string}>
                  <label className="text-sm font-medium text-foreground">{field.label}</label>
                  <p className="text-xs text-muted-foreground">{field.help}</p>
                  <div className="mt-2 flex gap-2">
                    {NIVEAUX.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => patch({ [field.key]: n } as Partial<Politique>)}
                        className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                          current === n
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-card text-foreground hover:bg-muted"
                        }`}
                      >
                        {NIVEAU_LABEL[n]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end border-t border-border pt-4">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer la politique avancée"}
          </button>
        </div>
      </div>
    </div>
  );
}
