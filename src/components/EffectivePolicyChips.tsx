/**
 * EffectivePolicyChips — affiche la politique effective résolue pour un collab.
 *
 * Affiche 3 chips compacts (Prix kWh / Horaires / Fermetures) avec la valeur
 * effective + la source (niveau qui a fourni la valeur). Lecture seule.
 *
 * Endpoint : GET /api/politiques-recharge/effective/{collaborateur_id}
 */
import { useEffect, useState } from "react";
import { Sparkles, Zap, Clock, CalendarX } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { apiFetch } from "@/lib/api";

interface EffectivePolicy {
  prix: {
    tarif_type: "flat" | "hp_hc";
    prix_kwh: number | null;
    tarif_hp: number | null;
    tarif_hc: number | null;
    plages_hp: any[];
    plages_hc: any[];
    source: string;
    niveau_max_autorise: string;
  };
  fermetures: {
    jours_fermeture: number;
    jours_fermeture_dates: string[];
    source_bitmask: string;
    source_dates: string;
    niveau_max_autorise: string;
  };
  conges: { niveau_max_autorise: string };
  horaires: { niveau_max_autorise: string };
  devise: string;
}

const SOURCE_LABEL: Record<string, string> = {
  entreprise: "Entreprise",
  filiale: "Filiale",
  site: "Site",
  collaborateur: "Collaborateur",
  default: "Défaut",
};

function _sourceColor(source: string): string {
  switch (source) {
    case "entreprise": return "bg-teal-50 text-teal-700 border-teal-200";
    case "filiale": return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "site": return "bg-violet-50 text-violet-700 border-violet-200";
    case "collaborateur": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

interface Props {
  collaborateurId: string;
}

export default function EffectivePolicyChips({ collaborateurId }: Props) {
  const [pol, setPol] = useState<EffectivePolicy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<EffectivePolicy>(
          `/api/politiques-recharge/effective/${collaborateurId}`
        );
        if (!cancelled) setPol(data);
      } catch (err) {
        console.error("Erreur chargement politique effective", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [collaborateurId]);

  if (loading || !pol) return null;

  const isHpHc = pol.prix.tarif_type === "hp_hc";

  const prixLabel = isHpHc
    ? `HP ${pol.prix.tarif_hp?.toFixed(2) ?? "—"} / HC ${pol.prix.tarif_hc?.toFixed(2) ?? "—"} €`
    : pol.prix.prix_kwh != null
      ? `${pol.prix.prix_kwh.toFixed(2)} € / kWh`
      : "—";

  const fermeturesCount =
    (pol.fermetures.jours_fermeture_dates?.length || 0) +
    (pol.fermetures.jours_fermeture ? popcount(pol.fermetures.jours_fermeture) : 0);

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-card-foreground">Politique effective</h3>
          <span className="text-xs text-muted-foreground">— résolue par cascade</span>
        </div>
        <Link
          to="/dashboard/reglages"
          className="text-xs text-primary hover:underline"
        >
          Modifier
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Chip
          icon={Zap}
          title="Prix kWh"
          value={prixLabel}
          source={pol.prix.source}
        />
        <Chip
          icon={Clock}
          title={isHpHc ? "Horaires HP/HC" : "Horaires"}
          value={isHpHc ? `${pol.prix.plages_hp.length} HP / ${pol.prix.plages_hc.length} HC` : "Non applicable (tarif flat)"}
          source={isHpHc ? pol.prix.source : "default"}
        />
        <Chip
          icon={CalendarX}
          title="Fermetures"
          value={fermeturesCount > 0 ? `${fermeturesCount} jour${fermeturesCount > 1 ? "s" : ""}` : "Aucune"}
          source={pol.fermetures.source_dates !== "default" ? pol.fermetures.source_dates : pol.fermetures.source_bitmask}
        />
      </div>
    </div>
  );
}

function Chip({
  icon: Icon, title, value, source,
}: { icon: any; title: string; value: string; source: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {title}
      </div>
      <p className="mt-1 text-sm font-semibold text-card-foreground tabular-nums">{value}</p>
      <span className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${_sourceColor(source)}`}>
        géré par {SOURCE_LABEL[source] || source}
      </span>
    </div>
  );
}

/** Compte le nombre de bits à 1 dans le bitmask (jours hebdo). */
function popcount(n: number): number {
  let c = 0;
  while (n) { c += n & 1; n >>= 1; }
  return c;
}
