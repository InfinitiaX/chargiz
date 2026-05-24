import { useState, useEffect } from "react";
import { X, Building2, Search, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Entreprise {
  id: string;
  nom: string;
  ville: string | null;
  is_active: boolean;
}

interface Admin {
  id: number;
  email: string;
  full_name: string | null;
}

interface Props {
  open: boolean;
  admin: Admin;
  onClose: () => void;
  onUpdated: () => void;
}

/**
 * Dialog pour attribuer/révoquer des entreprises à un admin.
 * Affichage multi-select avec checkbox + recherche + récap.
 */
export default function AdminAssignDialog({ open, admin, onClose, onUpdated }: Props) {
  const [allEntreprises, setAllEntreprises] = useState<Entreprise[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [initialAssignedIds, setInitialAssignedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setError(null);
    loadData();
  }, [open, admin.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [allEnts, assigned] = await Promise.all([
        api.entreprises.list(),
        api.admins.listEntreprises(admin.id),
      ]);
      setAllEntreprises(allEnts);
      const assignedSet = new Set<string>(assigned.map((e: any) => e.id));
      setAssignedIds(assignedSet);
      setInitialAssignedIds(new Set(assignedSet));
    } catch (err: any) {
      setError(err.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  const toggle = (id: string) => {
    setAssignedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.admins.setEntreprises(admin.id, Array.from(assignedIds));
      const added = Array.from(assignedIds).filter(id => !initialAssignedIds.has(id)).length;
      const removed = Array.from(initialAssignedIds).filter(id => !assignedIds.has(id)).length;
      toast.success(`${admin.full_name || admin.email} mis à jour`, {
        description: `${added} ajout${added > 1 ? "s" : ""}, ${removed} retrait${removed > 1 ? "s" : ""}.`,
        duration: 5000,
      });
      onUpdated();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const filtered = allEntreprises.filter(e => {
    if (search && !`${e.nom} ${e.ville || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hasChanges = (() => {
    if (assignedIds.size !== initialAssignedIds.size) return true;
    for (const id of assignedIds) if (!initialAssignedIds.has(id)) return true;
    return false;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-card shadow-2xl border border-border max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-card-foreground truncate">
                Entreprises gérées
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {admin.full_name || admin.email} · {assignedIds.size} sélectionnée{assignedIds.size > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom ou ville..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-3 flex-1">
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
                <Building2 className="h-6 w-6 text-muted-foreground/70" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {search ? "Aucun résultat" : "Aucune entreprise"}
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map(e => {
                const checked = assignedIds.has(e.id);
                return (
                  <li key={e.id}>
                    <label className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                      checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                    }`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(e.id)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-card-foreground text-sm truncate flex items-center gap-2">
                          {e.nom}
                          {!e.is_active && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">archivée</span>
                          )}
                        </p>
                        {e.ville && <p className="text-xs text-muted-foreground">{e.ville}</p>}
                      </div>
                      {checked && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-border shrink-0">
          <p className="text-xs text-muted-foreground">
            {hasChanges && <span className="text-amber-600">Modifications non enregistrées</span>}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              Fermer
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? (
                <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enregistrement...</>
              ) : (
                <>Enregistrer <ChevronRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
