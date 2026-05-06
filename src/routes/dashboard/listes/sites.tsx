import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Archive, Download, MapPin } from "lucide-react";
import CreateSiteDialog from "@/components/CreateSiteDialog";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { exportCSV } from "@/lib/export";

export const Route = createFileRoute("/dashboard/listes/sites")({
  component: ListeSites,
  head: () => ({ meta: [{ title: "ChargiZ — Sites" }] }),
});

interface Site {
  id: string;
  nom: string;
  filiale_id: string;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  responsable_nom: string | null;
  responsable_prenom: string | null;
  responsable_email: string | null;
  responsable_telephone: string | null;
  is_active: boolean;
  created_at: string;
}

interface Filiale {
  id: string;
  nom: string;
  entreprise_id: string;
  is_active: boolean;
}

function ListeSites() {
  const { role, loading } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [search, setSearch] = useState("");
  const [filterFilialeId, setFilterFilialeId] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);

  const canAccess =
    role === "superadmin" ||
    role === "gestionnaire_entreprise" ||
    role === "gestionnaire_filiale" ||
    role === "gestionnaire_site";
  const canCreate =
    role === "superadmin" ||
    role === "gestionnaire_entreprise" ||
    role === "gestionnaire_filiale";
  const canArchive = canCreate;

  useEffect(() => {
    if (loading || !canAccess) return;
    loadData();
  }, [loading, canAccess]);

  async function loadData() {
    try {
      const [sitesData, filialesData] = await Promise.all([
        api.sites.list(),
        api.filiales.list(),
      ]);
      setSites(sitesData);
      setFiliales(filialesData);
    } catch (err) {
      console.error("Error loading sites/filiales:", err);
    }
  }

  const handleArchive = async (id: string, nom: string) => {
    if (!confirm(`Voulez-vous archiver le site "${nom}" ?`)) return;
    try {
      await api.sites.archive(id);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'archivage");
    }
  };

  const filialeName = (id: string) => filiales.find(f => f.id === id)?.nom || "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!canAccess) {
    return <div className="p-8"><p className="text-muted-foreground">Accès non autorisé.</p></div>;
  }

  const filtered = sites.filter(s => {
    if (filterFilialeId && s.filiale_id !== filterFilialeId) return false;
    if (!search) return true;
    return `${s.nom} ${s.ville || ""} ${s.responsable_email || ""}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Sites</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez les sites et leurs gestionnaires</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => exportCSV("sites", filtered.map(s => ({
              Nom: s.nom,
              Filiale: filialeName(s.filiale_id),
              Adresse: s.adresse || "—",
              Ville: s.ville || "—",
              CodePostal: s.code_postal || "—",
              Responsable: `${s.responsable_prenom || ""} ${s.responsable_nom || ""}`.trim() || "—",
              Email: s.responsable_email || "—",
              Etat: s.is_active ? "Actif" : "Archivé",
              "Date création": new Date(s.created_at).toLocaleDateString("fr-FR"),
            })))}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Exporter
          </button>
          {canCreate && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
              <Plus className="h-4 w-4" /> Ajouter un site
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher par nom, ville..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        {filiales.length > 1 && (
          <select value={filterFilialeId} onChange={e => setFilterFilialeId(e.target.value)}
            className="rounded-lg border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
            <option value="">Toutes les filiales</option>
            {filiales.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Site</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Filiale</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Ville</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Responsable</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">État</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Aucun site trouvé
                </td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-card-foreground">{s.nom}</td>
                  <td className="px-6 py-4 text-card-foreground">{filialeName(s.filiale_id)}</td>
                  <td className="px-6 py-4 text-card-foreground">
                    {s.ville ? `${s.ville}${s.code_postal ? ` (${s.code_postal})` : ""}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-card-foreground">
                    {s.responsable_prenom || s.responsable_nom
                      ? `${s.responsable_prenom || ""} ${s.responsable_nom || ""}`.trim()
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
                      {s.is_active ? "Actif" : "Archivé"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canArchive && s.is_active && (
                        <button onClick={() => handleArchive(s.id, s.nom)} title="Archiver"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateSiteDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={loadData}
        filialeId={role === "gestionnaire_filiale" && filiales[0] ? filiales[0].id : null}
        selectableFiliales={filiales}
      />
    </div>
  );
}
