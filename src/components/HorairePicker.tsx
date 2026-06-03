/**
 * HorairePicker — édition des plages HP/HC par jour de semaine (CDC §3.3.2.4).
 *
 * Format de chaque plage : { jour: 0..6 (lundi=0), debut: "HH:MM", fin: "HH:MM" }.
 * Une plage où `fin <= debut` traverse minuit (ex: 22:00 → 06:00).
 *
 * - 7 lignes (lundi → dimanche) avec ajout/suppression de plages.
 * - Validation visuelle des chevauchements *intra-jour* en temps réel.
 * - Helper "Appliquer à tous les jours" pour dupliquer rapidement une config.
 *
 * Pas de stockage interne — `onChange` est appelé à chaque modification.
 */
import { useMemo } from "react";
import { Plus, Trash2, Copy } from "lucide-react";

export interface Plage {
  jour: number;       // 0 = lundi … 6 = dimanche
  debut: string;      // "HH:MM"
  fin: string;        // "HH:MM"
}

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function _toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** True si la plage est valide (HH:MM bien formé). Une plage où fin<=debut est
 * considérée comme valide (traverse minuit). */
function _isValid(p: Plage): boolean {
  return /^\d{2}:\d{2}$/.test(p.debut) && /^\d{2}:\d{2}$/.test(p.fin);
}

/** True si deux plages du MÊME jour se chevauchent. Ne gère pas les plages
 * traversant minuit (UI les présente comme « jusqu'au lendemain »). */
function _overlaps(a: Plage, b: Plage): boolean {
  if (a.jour !== b.jour) return false;
  const aStart = _toMinutes(a.debut);
  const aEnd = _toMinutes(a.fin);
  const bStart = _toMinutes(b.debut);
  const bEnd = _toMinutes(b.fin);
  // Plage traverse minuit ?
  const aCrosses = aEnd <= aStart;
  const bCrosses = bEnd <= bStart;
  if (aCrosses || bCrosses) return false; // tolérant côté UI
  return aStart < bEnd && bStart < aEnd;
}

interface Props {
  /** Plages courantes (contrôlé). */
  value: Plage[];
  /** Émis à chaque modification. */
  onChange: (next: Plage[]) => void;
  /** Libellé pour les écrans lecteurs / titre de la zone. */
  label?: string;
  /** Couleur d'accent pour différencier HP (ambre) de HC (teal). */
  accent?: "hp" | "hc";
  disabled?: boolean;
}

export default function HorairePicker({
  value, onChange, label, accent = "hp", disabled = false,
}: Props) {
  const byJour = useMemo(() => {
    const m = new Map<number, Plage[]>();
    for (let j = 0; j < 7; j++) m.set(j, []);
    for (const p of value) {
      if (!m.has(p.jour)) m.set(p.jour, []);
      m.get(p.jour)!.push(p);
    }
    return m;
  }, [value]);

  // Détecte les chevauchements pour signaler à l'utilisateur (anneau rouge).
  const overlapsByPlageIdx = useMemo(() => {
    const out = new Set<number>();
    for (let i = 0; i < value.length; i++) {
      for (let j = i + 1; j < value.length; j++) {
        if (_overlaps(value[i], value[j])) {
          out.add(i); out.add(j);
        }
      }
    }
    return out;
  }, [value]);

  const addPlage = (jour: number) => {
    onChange([...value, { jour, debut: "08:00", fin: "18:00" }]);
  };

  const removePlage = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const updatePlage = (idx: number, patch: Partial<Plage>) => {
    const next = value.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const applyToAllDays = (sourceJour: number) => {
    const source = value.filter(p => p.jour === sourceJour);
    if (source.length === 0) return;
    const next = value.filter(p => p.jour === sourceJour);
    for (let j = 0; j < 7; j++) {
      if (j === sourceJour) continue;
      for (const p of source) {
        next.push({ jour: j, debut: p.debut, fin: p.fin });
      }
    }
    onChange(next);
  };

  const accentRing = accent === "hp"
    ? "focus:border-amber-500 focus:ring-amber-500/20"
    : "focus:border-chargiz-teal focus:ring-chargiz-teal/20";
  const accentBg = accent === "hp" ? "bg-amber-50" : "bg-teal-50";
  const accentText = accent === "hp" ? "text-amber-900" : "text-teal-900";

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {label && (
        <div className={`mb-3 flex items-center gap-2 rounded-md ${accentBg} px-3 py-2`}>
          <span className={`text-sm font-semibold ${accentText}`}>{label}</span>
          <span className="text-xs text-muted-foreground">
            {value.length} plage{value.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {JOURS.map((jourLabel, jourIdx) => {
          const plagesJour = byJour.get(jourIdx) || [];
          return (
            <div key={jourIdx} className="grid grid-cols-[6rem_1fr_auto] items-start gap-3 py-1">
              <div className="pt-2 text-sm font-medium text-card-foreground">
                {jourLabel}
              </div>
              <div className="flex flex-wrap gap-2">
                {plagesJour.length === 0 && (
                  <span className="self-center text-xs italic text-muted-foreground">
                    aucune plage
                  </span>
                )}
                {plagesJour.map((p) => {
                  const idx = value.indexOf(p);
                  const overlap = overlapsByPlageIdx.has(idx);
                  const crossesMidnight = _isValid(p) && _toMinutes(p.fin) <= _toMinutes(p.debut);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs ${
                        overlap ? "border-red-400 ring-2 ring-red-200" : "border-border"
                      }`}
                      title={overlap ? "Plage en chevauchement avec une autre du même jour" : undefined}
                    >
                      <input
                        type="time"
                        value={p.debut}
                        disabled={disabled}
                        onChange={(e) => updatePlage(idx, { debut: e.target.value })}
                        className={`w-20 rounded border-0 bg-transparent p-0.5 text-xs outline-none ${accentRing}`}
                      />
                      <span className="text-muted-foreground">→</span>
                      <input
                        type="time"
                        value={p.fin}
                        disabled={disabled}
                        onChange={(e) => updatePlage(idx, { fin: e.target.value })}
                        className={`w-20 rounded border-0 bg-transparent p-0.5 text-xs outline-none ${accentRing}`}
                      />
                      {crossesMidnight && (
                        <span
                          className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                          title="Cette plage traverse minuit"
                        >
                          +1j
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => removePlage(idx)}
                        className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        title="Supprimer cette plage"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1 pt-1">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => addPlage(jourIdx)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-muted"
                  title="Ajouter une plage"
                >
                  <Plus className="h-3 w-3" />
                </button>
                {plagesJour.length > 0 && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => applyToAllDays(jourIdx)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-muted"
                    title="Appliquer la configuration de ce jour à tous les autres jours"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {overlapsByPlageIdx.size > 0 && (
        <p className="mt-3 text-xs text-red-600">
          ⚠ Certaines plages se chevauchent sur un même jour — elles seront refusées à la sauvegarde.
        </p>
      )}
    </div>
  );
}
