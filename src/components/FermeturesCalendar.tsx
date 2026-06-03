/**
 * FermeturesCalendar — multi-sélection de dates calendaires de fermeture
 * (jours fériés, fermetures exceptionnelles, ponts) — CDC §3.3.2.5.
 *
 * Format : tableau de chaînes ISO "YYYY-MM-DD", trié chronologiquement.
 * Les sessions de recharge à ces dates sont marquées non remboursables
 * (`reason_non_remboursable = 'fermeture'`).
 *
 * UI :
 *  - input type="date" + bouton "Ajouter"
 *  - liste de chips triées chronologiquement avec bouton "x" par chip
 *  - presets rapides : "Noël 25/12", "1er janvier", "1er mai", "14 juillet", "15 août", "1er nov", "11 nov"
 *    (uniquement si la date n'est pas déjà présente)
 */
import { useMemo, useState } from "react";
import { Plus, X, Calendar } from "lucide-react";

/** Fériés français récurrents (mois-jour). */
const PRESETS_FR: Array<{ md: string; label: string }> = [
  { md: "01-01", label: "1er janvier" },
  { md: "05-01", label: "1er mai" },
  { md: "05-08", label: "8 mai" },
  { md: "07-14", label: "14 juillet" },
  { md: "08-15", label: "15 août" },
  { md: "11-01", label: "Toussaint" },
  { md: "11-11", label: "11 novembre" },
  { md: "12-25", label: "Noël" },
];

interface Props {
  value: string[];                  // ISO YYYY-MM-DD
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** Année par défaut pour les presets (défaut: année courante). */
  defaultYear?: number;
}

function _formatHumain(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function FermeturesCalendar({
  value, onChange, disabled = false, defaultYear,
}: Props) {
  const [draft, setDraft] = useState("");
  const year = defaultYear ?? new Date().getFullYear();

  const sorted = useMemo(() => [...value].sort(), [value]);

  const add = (iso: string) => {
    if (!iso || value.includes(iso)) return;
    onChange([...value, iso].sort());
  };

  const remove = (iso: string) => {
    onChange(value.filter((d) => d !== iso));
  };

  const applyPreset = (md: string) => {
    add(`${year}-${md}`);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-card-foreground">Jours de fermeture</span>
        <span className="text-xs text-muted-foreground">
          {value.length} date{value.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Ajout manuel */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          disabled={disabled || !draft}
          onClick={() => { add(draft); setDraft(""); }}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      {/* Presets fériés français */}
      <div className="mt-3">
        <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
          Presets fériés {year}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS_FR.map(({ md, label }) => {
            const iso = `${year}-${md}`;
            const already = value.includes(iso);
            return (
              <button
                key={md}
                type="button"
                disabled={disabled || already}
                onClick={() => applyPreset(md)}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  already
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {already ? "✓ " : "+ "}{label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chips dates ajoutées */}
      {sorted.length === 0 ? (
        <p className="mt-4 text-xs italic text-muted-foreground">
          Aucune date de fermeture configurée.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {sorted.map((iso) => (
            <span
              key={iso}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-card-foreground"
            >
              {_formatHumain(iso)}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(iso)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-card hover:text-destructive"
                  title="Retirer cette date"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
