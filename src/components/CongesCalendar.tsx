/**
 * CongesCalendar — gestion des périodes de congés d'un collaborateur (CDC §3.3.2.6).
 *
 * Une période = (date_debut, date_fin, motif?). Pendant un congé, les sessions
 * de recharge ne sont pas remboursables (cout_euro = 0, reason = 'conge').
 *
 * Le composant gère lui-même le cycle de vie :
 *  - charge la liste via GET /api/collaborateurs/{id}/conges
 *  - création via POST
 *  - suppression via DELETE
 * Émet `onChange` chaque fois que la liste change (pour rafraîchir un parent).
 */
import { useEffect, useState } from "react";
import { Plus, Trash2, CalendarDays, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface Conge {
  id: string;
  collaborateur_id: string;
  date_debut: string;  // ISO date
  date_fin: string;
  motif: string | null;
  created_at: string;
}

interface Props {
  collaborateurId: string;
  /** Bloque toute modification (consultation seule). */
  disabled?: boolean;
  /** Appelé chaque fois que la liste change (création / suppression). */
  onChange?: (conges: Conge[]) => void;
}

function _formatHumain(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function _todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CongesCalendar({ collaborateurId, disabled = false, onChange }: Props) {
  const [conges, setConges] = useState<Conge[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [motif, setMotif] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch<Conge[]>(`/api/collaborateurs/${collaborateurId}/conges`);
        if (!cancelled) {
          setConges(data);
          onChange?.(data);
        }
      } catch (err) {
        console.error("Erreur chargement congés", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaborateurId]);

  const resetForm = () => {
    setDateDebut(""); setDateFin(""); setMotif("");
    setShowForm(false);
  };

  const createConge = async () => {
    if (!dateDebut || !dateFin) {
      toast.error("Les deux dates sont obligatoires.");
      return;
    }
    if (dateFin < dateDebut) {
      toast.error("La date de fin doit être supérieure ou égale à la date de début.");
      return;
    }
    setCreating(true);
    try {
      const created = await apiFetch<Conge>(`/api/collaborateurs/${collaborateurId}/conges`, {
        method: "POST",
        body: JSON.stringify({
          date_debut: dateDebut,
          date_fin: dateFin,
          motif: motif.trim() || null,
        }),
      });
      const next = [...conges, created].sort((a, b) => b.date_debut.localeCompare(a.date_debut));
      setConges(next);
      onChange?.(next);
      toast.success("Congé enregistré.");
      resetForm();
    } catch (err: any) {
      toast.error("Échec de la création", { description: err?.message || "Réessayez plus tard." });
    } finally {
      setCreating(false);
    }
  };

  const deleteConge = async (id: string) => {
    if (!confirm("Supprimer ce congé ?")) return;
    try {
      await apiFetch(`/api/collaborateurs/${collaborateurId}/conges/${id}`, { method: "DELETE" });
      const next = conges.filter(c => c.id !== id);
      setConges(next);
      onChange?.(next);
      toast.success("Congé supprimé.");
    } catch (err: any) {
      toast.error("Échec de la suppression", { description: err?.message || "Réessayez plus tard." });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-card-foreground">Congés du collaborateur</span>
          <span className="text-xs text-muted-foreground">
            {conges.length} période{conges.length > 1 ? "s" : ""}
          </span>
        </div>
        {!disabled && !showForm && (
          <button
            type="button"
            onClick={() => {
              setDateDebut(_todayIso());
              setDateFin(_todayIso());
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-95"
          >
            <Plus className="h-3.5 w-3.5" /> Nouveau congé
          </button>
        )}
      </div>

      {/* Formulaire de création (inline) */}
      {showForm && !disabled && (
        <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Du</label>
              <input
                type="date"
                value={dateDebut}
                max={dateFin || undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  setDateDebut(v);
                  if (v && dateFin && v > dateFin) setDateFin(v);
                }}
                className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Au</label>
              <input
                type="date"
                value={dateFin}
                min={dateDebut || undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  setDateFin(v);
                  if (v && dateDebut && v < dateDebut) setDateDebut(v);
                }}
                className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Motif (optionnel)</label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                maxLength={200}
                placeholder="ex: vacances été"
                className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={createConge}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
            >
              {creating ? "Enregistrement…" : "Enregistrer le congé"}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <p className="text-xs italic text-muted-foreground">Chargement…</p>
      ) : conges.length === 0 ? (
        <div className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Aucun congé enregistré. Les périodes ajoutées ici rendront automatiquement non-remboursables
            les sessions de recharge qui tombent pendant ces dates.
          </span>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {[...conges]
            .sort((a, b) => b.date_debut.localeCompare(a.date_debut))
            .map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="flex-1">
                  <p className="text-card-foreground">
                    Du <span className="font-medium">{_formatHumain(c.date_debut)}</span>
                    {" "}au <span className="font-medium">{_formatHumain(c.date_fin)}</span>
                  </p>
                  {c.motif && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.motif}</p>
                  )}
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => deleteConge(c.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    title="Supprimer ce congé"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
