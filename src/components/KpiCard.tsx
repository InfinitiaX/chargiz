import { type LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

/**
 * Variantes sémantiques limitées pour préserver la cohérence visuelle avec la
 * sidebar (teal + lime). Plus de palette arc-en-ciel : chaque KPI choisit l'un
 * des registres ci-dessous.
 */
export type KpiTone = "primary" | "accent" | "neutral" | "warning";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  /** Registre visuel — défaut : neutral */
  tone?: KpiTone;
  /** Classe custom pour le conteneur d'icône (override le `tone`).
   *  Ex : "bg-violet-100 text-violet-600". */
  iconClass?: string;
  /** [Deprecated] ancienne API : classe Tailwind brute. Conservée pour compat le temps de la migration. */
  colorClass?: string;
}

const TONE_STYLES: Record<KpiTone, { icon: string }> = {
  // Teal — KPIs structurels et opérationnels (entreprises, sessions, énergie)
  primary: {
    icon: "bg-chargiz-teal/10 text-chargiz-teal",
  },
  // Lime — KPIs "verts" / financiers / écologiques (à rembourser, CO₂, énergie domicile)
  accent: {
    icon: "bg-chargiz-lime/25 text-chargiz-teal",
  },
  // Gris doux — KPIs neutres de comptage (filiales, sites, conducteurs, véhicules)
  neutral: {
    icon: "bg-muted text-muted-foreground",
  },
  // Ambre — alertes
  warning: {
    icon: "bg-amber-500/10 text-amber-600",
  },
};

function parseDisplayValue(raw: string): { number: number; decimals: number; prefix: string; suffix: string } | null {
  const match = raw.match(/^([^\d-]*)(-?[\d\s  ]+(?:[.,]\d+)?)(.*)$/);
  if (!match) return null;
  const [, prefix, numberPart, suffix] = match;
  const normalized = numberPart.replace(/[\s  ]/g, "").replace(",", ".");
  const n = parseFloat(normalized);
  if (Number.isNaN(n)) return null;
  const decimalsMatch = normalized.match(/\.(\d+)$/);
  const decimals = decimalsMatch ? decimalsMatch[1].length : 0;
  return { number: n, decimals, prefix, suffix };
}

function formatFR(n: number, decimals: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function AnimatedValue({ raw }: { raw: string }) {
  const parsed = parseDisplayValue(raw);
  if (!parsed) return <>{raw}</>;
  const animated = useCountUp(parsed.number, { duration: 700, decimals: parsed.decimals });
  return <>{parsed.prefix}{formatFR(animated, parsed.decimals)}{parsed.suffix}</>;
}

/**
 * Devine la tonalité à partir de l'ancienne `colorClass`, le temps que les appels migrent.
 * Évite d'avoir un PR géant et garde l'écran fonctionnel pendant la transition.
 */
function inferToneFromColorClass(colorClass?: string): KpiTone {
  if (!colorClass) return "neutral";
  if (colorClass.includes("chargiz-lime")) return "accent";
  if (colorClass.includes("kpi-energy") || colorClass.includes("kpi-home")) return "accent";
  if (colorClass.includes("kpi-sessions")) return "primary";
  if (colorClass.includes("kpi-away")) return "primary";
  return "neutral";
}

export default function KpiCard({ title, value, subtitle, icon: Icon, tone, iconClass, colorClass }: KpiCardProps) {
  const effectiveTone: KpiTone = tone ?? inferToneFromColorClass(colorClass);
  const finalIconClass = iconClass || TONE_STYLES[effectiveTone].icon;

  return (
    <div className="group flex h-full flex-col rounded-xl border border-border border-b-2 border-b-[#0f4b49] bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      {/* Icône en haut à gauche, dans un carré coloré */}
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${finalIconClass}`}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </div>
      {/* Titre */}
      <p className="text-xs font-normal text-muted-foreground truncate">{title}</p>
      {/* Valeur */}
      <p className="mt-1 text-2xl leading-tight font-semibold tracking-tight text-card-foreground tabular-nums">
        <AnimatedValue raw={value} />
      </p>
      {subtitle && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
