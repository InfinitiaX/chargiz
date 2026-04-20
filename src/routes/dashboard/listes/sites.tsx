import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import CreateSiteDialog from "@/components/CreateSiteDialog";
import { Search, MapPin, Eye, Edit, Archive, Plus, X, Download } from "lucide-react";
import { exportCSV } from "@/lib/export";

export const Route = createFileRoute("/dashboard/listes/sites")({
  component: ListeSites,
  head: () => ({ meta: [{ title: "ChargiZ — Sites" }] }),
});

interface Site {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  siret: string | null;
  responsable_nom: string | null;
  responsable_prenom: string | null;
  responsable_email: string | null;
  responsable_telephone: string | null;
  filiale_id: string;
}

function ListeSites() {
  const { profile, loading } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const [sites, setSites] = useState<Site[]>([]);
  const [filiales, setFiliales] = useState<Record<string, string>>({});
  const [collabCounts, setCollabCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [viewSite, setViewSite] = useState<Site | null>(null);

  useEffect(() => {
    if (loading || !entrepriseId) return;
    loadData();
  }, [loading, entrepriseId]);

  async function loadData() {
    const { data: fil } = await supabase.from("filiales").select("id, nom").eq("entreprise_id", entrepriseId);
    const filMap: Record<string, string> = {};
    if (fil) fil.forEach(f => { filMap[f.id] = f.nom; });
    setFiliales(filMap);

    const filialeIds = Object.keys(filMap);
    if (filialeIds.length === 0) return;

    const { data } = await supabase.from("sites").select("*").in("filiale_id", filialeIds).order("nom");
    if (data) {
      setSites(data as Site[]);
      const counts: Record<string, number> = {};
      for (const s of data) {
        const { count } = await supabase.from("profiles").select("id", { count: "exact" }).eq("site_id", s.id);
        counts[s.id] = count || 0;
      }
      setCollabCounts(counts);
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm("Voulez-vous supprimer ce site ?")) return;
    await supabase.from("sites").delete().eq("id", id);
    loadData();
  };

  const handleEditSave = async () => {
    if (!editSite) return;
    await supabase.from("sites").update({
      nom: editSite.nom,
      adresse: editSite.adresse,
      ville: editSite.ville,
      code_postal: editSite.code_postal,
      siret: editSite.siret,
      responsable_nom: editSite.responsable_nom,
      responsable_prenom: editSite.responsable_prenom,
      responsable_email: editSite.responsable_email,
      responsable_telephone: editSite.responsable_telephone,
    }).eq("id", editSite.id);
    setEditSite(null);
    loadData();
  };

  const filtered = sites.filter(s => !search || `${s.nom} ${s.ville}`.toLowerCase().includes(search.toLowerCase()));
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Sites</h1>
          <p className="mt-1 text-sm text-muted-foreground">Liste des sites de l'entreprise</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button onClick={() => exportCSV("sites", filtered.map(s => ({
            Nom: s.nom, Filiale: filiales[s.filiale_id] || "",
            Adresse: s.adresse || "", "Code postal": s.code_postal || "", Ville: s.ville || "",
            SIRET: s.siret || "",
            Responsable: [s.responsable_prenom, s.responsable_nom].filter(Boolean).join(" "),
            "Email resp.": s.responsable_email || "", "Tél. resp.": s.responsable_telephone || "",
            "Nb collaborateurs": collabCounts[s.id] ?? 0,
          })))} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Exporter
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
            <Plus className="h-4 w-4" /> Ajouter un site
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
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Filiale</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Adresse</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Responsable</th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground">Nb collaborateurs</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Aucun site</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-card-foreground">{s.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-card-foreground">{filiales[s.filiale_id] || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">{[s.adresse, s.ville].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">{[s.responsable_prenom, s.responsable_nom].filter(Boolean).join(" ") || "—"}</td>
                  <td className="px-6 py-4 text-center text-card-foreground">{collabCounts[s.id] || 0}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-chargiz-teal/10 px-2.5 py-0.5 text-xs font-medium text-chargiz-teal">Actif</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewSite(s)} title="Voir" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => setEditSite({ ...s })} title="Modifier" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleArchive(s.id)} title="Supprimer" className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Archive className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {entrepriseId && <CreateSiteDialog entrepriseId={entrepriseId} open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />}

      {/* View Dialog */}
      {viewSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-lg font-semibold text-card-foreground">{viewSite.nom}</h2>
              <button onClick={() => setViewSite(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Filiale</p><p className="mt-1 text-card-foreground">{filiales[viewSite.filiale_id] || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Adresse</p><p className="mt-1 text-card-foreground">{[viewSite.adresse, viewSite.code_postal, viewSite.ville].filter(Boolean).join(", ") || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">SIRET</p><p className="mt-1 font-mono text-card-foreground">{viewSite.siret || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Responsable</p><p className="mt-1 text-card-foreground">{[viewSite.responsable_prenom, viewSite.responsable_nom].filter(Boolean).join(" ") || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Email resp.</p><p className="mt-1 text-card-foreground">{viewSite.responsable_email || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Tél. resp.</p><p className="mt-1 text-card-foreground">{viewSite.responsable_telephone || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Collaborateurs</p><p className="mt-1 font-bold text-card-foreground">{collabCounts[viewSite.id] || 0}</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-lg font-semibold text-card-foreground">Modifier le site</h2>
              <button onClick={() => setEditSite(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium text-foreground">Nom</label><input className={inputCls} value={editSite.nom} onChange={e => setEditSite({ ...editSite, nom: e.target.value })} /></div>
              <div><label className="text-sm font-medium text-foreground">Adresse</label><input className={inputCls} value={editSite.adresse || ""} onChange={e => setEditSite({ ...editSite, adresse: e.target.value })} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-foreground">Code postal</label><input className={inputCls} value={editSite.code_postal || ""} onChange={e => setEditSite({ ...editSite, code_postal: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">Ville</label><input className={inputCls} value={editSite.ville || ""} onChange={e => setEditSite({ ...editSite, ville: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium text-foreground">SIRET</label><input className={inputCls} value={editSite.siret || ""} onChange={e => setEditSite({ ...editSite, siret: e.target.value })} /></div>
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground mb-3">Responsable</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-sm text-muted-foreground">Nom</label><input className={inputCls} value={editSite.responsable_nom || ""} onChange={e => setEditSite({ ...editSite, responsable_nom: e.target.value })} /></div>
                  <div><label className="text-sm text-muted-foreground">Prénom</label><input className={inputCls} value={editSite.responsable_prenom || ""} onChange={e => setEditSite({ ...editSite, responsable_prenom: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div><label className="text-sm text-muted-foreground">Email</label><input className={inputCls} value={editSite.responsable_email || ""} onChange={e => setEditSite({ ...editSite, responsable_email: e.target.value })} /></div>
                  <div><label className="text-sm text-muted-foreground">Téléphone</label><input className={inputCls} value={editSite.responsable_telephone || ""} onChange={e => setEditSite({ ...editSite, responsable_telephone: e.target.value })} /></div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditSite(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">Annuler</button>
                <button onClick={handleEditSave} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
