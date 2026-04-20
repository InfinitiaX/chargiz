import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import CreateFilialeDialog from "@/components/CreateFilialeDialog";
import { Search, Building2, Eye, Edit, Archive, Plus, X, Download } from "lucide-react";
import { exportCSV } from "@/lib/export";

export const Route = createFileRoute("/dashboard/listes/filiales")({
  component: ListeFiliales,
  head: () => ({ meta: [{ title: "ChargiZ — Filiales" }] }),
});

interface Filiale {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  siret: string | null;
  numero_tva: string | null;
  responsable_nom: string | null;
  responsable_prenom: string | null;
  responsable_email: string | null;
  responsable_telephone: string | null;
  entreprise_id: string;
}

function ListeFiliales() {
  const { profile, loading } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [stats, setStats] = useState<Record<string, { sites: number; collabs: number }>>({});
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editFiliale, setEditFiliale] = useState<Filiale | null>(null);
  const [viewFiliale, setViewFiliale] = useState<Filiale | null>(null);

  useEffect(() => {
    if (loading || !entrepriseId) return;
    loadData();
  }, [loading, entrepriseId]);

  async function loadData() {
    const { data } = await supabase.from("filiales").select("*").eq("entreprise_id", entrepriseId).order("nom");
    if (data) {
      setFiliales(data as Filiale[]);
      const map: Record<string, { sites: number; collabs: number }> = {};
      for (const f of data) {
        const [s, c] = await Promise.all([
          supabase.from("sites").select("id", { count: "exact" }).eq("filiale_id", f.id),
          supabase.from("profiles").select("id", { count: "exact" }).eq("filiale_id", f.id),
        ]);
        map[f.id] = { sites: s.count || 0, collabs: c.count || 0 };
      }
      setStats(map);
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm("Voulez-vous archiver cette filiale ? Cette action désactivera la filiale.")) return;
    await supabase.from("filiales").delete().eq("id", id);
    loadData();
  };

  const handleEditSave = async () => {
    if (!editFiliale) return;
    await supabase.from("filiales").update({
      nom: editFiliale.nom,
      adresse: editFiliale.adresse,
      ville: editFiliale.ville,
      code_postal: editFiliale.code_postal,
      siret: editFiliale.siret,
      numero_tva: editFiliale.numero_tva,
      responsable_nom: editFiliale.responsable_nom,
      responsable_prenom: editFiliale.responsable_prenom,
      responsable_email: editFiliale.responsable_email,
      responsable_telephone: editFiliale.responsable_telephone,
    }).eq("id", editFiliale.id);
    setEditFiliale(null);
    loadData();
  };

  const filtered = filiales.filter(f => !search || `${f.nom} ${f.ville}`.toLowerCase().includes(search.toLowerCase()));
  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Filiales</h1>
          <p className="mt-1 text-sm text-muted-foreground">Liste des filiales de l'entreprise</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button onClick={() => exportCSV("filiales", filtered.map(f => ({
            Nom: f.nom, Adresse: f.adresse || "", Ville: f.ville || "", "Code postal": f.code_postal || "",
            SIRET: f.siret || "", "TVA": f.numero_tva || "",
            Responsable: [f.responsable_prenom, f.responsable_nom].filter(Boolean).join(" "),
            "Email resp.": f.responsable_email || "", "Tél. resp.": f.responsable_telephone || "",
            "Nb sites": stats[f.id]?.sites ?? 0, "Nb collaborateurs": stats[f.id]?.collabs ?? 0,
          })))} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Exporter
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
            <Plus className="h-4 w-4" /> Ajouter une filiale
          </button>
        </div>
      </div>
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Adresse</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Responsable</th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground">Nb sites</th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground">Nb collaborateurs</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Aucune filiale</td></tr>
              ) : filtered.map(f => {
                const s = stats[f.id] || { sites: 0, collabs: 0 };
                return (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-card-foreground">{f.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-card-foreground">{[f.adresse, f.ville].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-6 py-4 text-card-foreground">{[f.responsable_prenom, f.responsable_nom].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-6 py-4 text-center text-card-foreground">{s.sites}</td>
                    <td className="px-6 py-4 text-center text-card-foreground">{s.collabs}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-chargiz-teal/10 px-2.5 py-0.5 text-xs font-medium text-chargiz-teal">Actif</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewFiliale(f)} title="Voir" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => setEditFiliale({ ...f })} title="Modifier" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleArchive(f.id)} title="Archiver" className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Archive className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {entrepriseId && <CreateFilialeDialog entrepriseId={entrepriseId} open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />}

      {/* View Dialog */}
      {viewFiliale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-lg font-semibold text-card-foreground">{viewFiliale.nom}</h2>
              <button onClick={() => setViewFiliale(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Adresse</p><p className="mt-1 text-card-foreground">{[viewFiliale.adresse, viewFiliale.code_postal, viewFiliale.ville].filter(Boolean).join(", ") || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">SIRET</p><p className="mt-1 font-mono text-card-foreground">{viewFiliale.siret || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">N° TVA</p><p className="mt-1 text-card-foreground">{viewFiliale.numero_tva || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Responsable</p><p className="mt-1 text-card-foreground">{[viewFiliale.responsable_prenom, viewFiliale.responsable_nom].filter(Boolean).join(" ") || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Email resp.</p><p className="mt-1 text-card-foreground">{viewFiliale.responsable_email || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Tél. resp.</p><p className="mt-1 text-card-foreground">{viewFiliale.responsable_telephone || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Sites</p><p className="mt-1 font-bold text-card-foreground">{stats[viewFiliale.id]?.sites || 0}</p></div>
              <div><p className="text-muted-foreground text-xs">Collaborateurs</p><p className="mt-1 font-bold text-card-foreground">{stats[viewFiliale.id]?.collabs || 0}</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editFiliale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-lg font-semibold text-card-foreground">Modifier la filiale</h2>
              <button onClick={() => setEditFiliale(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium text-foreground">Nom</label><input className={inputCls} value={editFiliale.nom} onChange={e => setEditFiliale({ ...editFiliale, nom: e.target.value })} /></div>
              <div><label className="text-sm font-medium text-foreground">Adresse</label><input className={inputCls} value={editFiliale.adresse || ""} onChange={e => setEditFiliale({ ...editFiliale, adresse: e.target.value })} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-foreground">Code postal</label><input className={inputCls} value={editFiliale.code_postal || ""} onChange={e => setEditFiliale({ ...editFiliale, code_postal: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">Ville</label><input className={inputCls} value={editFiliale.ville || ""} onChange={e => setEditFiliale({ ...editFiliale, ville: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-foreground">SIRET</label><input className={inputCls} value={editFiliale.siret || ""} onChange={e => setEditFiliale({ ...editFiliale, siret: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">N° TVA</label><input className={inputCls} value={editFiliale.numero_tva || ""} onChange={e => setEditFiliale({ ...editFiliale, numero_tva: e.target.value })} /></div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground mb-3">Responsable</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-sm text-muted-foreground">Nom</label><input className={inputCls} value={editFiliale.responsable_nom || ""} onChange={e => setEditFiliale({ ...editFiliale, responsable_nom: e.target.value })} /></div>
                  <div><label className="text-sm text-muted-foreground">Prénom</label><input className={inputCls} value={editFiliale.responsable_prenom || ""} onChange={e => setEditFiliale({ ...editFiliale, responsable_prenom: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div><label className="text-sm text-muted-foreground">Email</label><input className={inputCls} value={editFiliale.responsable_email || ""} onChange={e => setEditFiliale({ ...editFiliale, responsable_email: e.target.value })} /></div>
                  <div><label className="text-sm text-muted-foreground">Téléphone</label><input className={inputCls} value={editFiliale.responsable_telephone || ""} onChange={e => setEditFiliale({ ...editFiliale, responsable_telephone: e.target.value })} /></div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditFiliale(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">Annuler</button>
                <button onClick={handleEditSave} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
