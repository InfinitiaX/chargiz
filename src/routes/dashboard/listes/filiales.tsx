import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Archive, Download, Building2 } from "lucide-react";
import CreateFilialeDialog from "@/components/CreateFilialeDialog";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { exportCSV } from "@/lib/export";

export const Route = createFileRoute("/dashboard/listes/filiales")({
  component: ListeFiliales,
  head: () => ({ meta: [{ title: "ChargiZ — Filiales" }] }),
});

interface Filiale {
  id: string;
  nom: string;
  entreprise_id: string;
  responsable_nom: string | null;
  responsable_prenom: string | null;
  responsable_email: string | null;
  responsable_telephone: string | null;
  is_active: boolean;
  created_at: string;
}

function ListeFiliales() {
  const { role, profile, loading } = useAuth();
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const canAccess = role === "superadmin" || role === "gestionnaire_entreprise" || role === "gestionnaire_filiale";
  const canCreate = role === "superadmin" || role === "gestionnaire_entreprise";

  useEffect(() => {
    if (loading || !canAccess) return;
    loadData();
  }, [loading, canAccess]);

  async function loadData() {
    try {
      const data = await api.filiales.list();
      setFiliales(data);
    } catch (err) {
      console.error("Error loading filiales:", err);
    }
  }

  const handleArchive = async (id: string, nom: string) => {
    if (!confirm(`Voulez-vous archiver la filiale "${nom}" ? Elle ne sera plus active.`)) return;
    try {
      await api.filiales.archive(id);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'archivage");
    }
  };

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

  const filtered = filiales.filter(f =>
    !search || `${f.nom} ${f.responsable_nom || ""} ${f.responsable_email || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Filiales</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez les filiales et leurs gestionnaires</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => exportCSV("filiales", filtered.map(f => ({
              Nom: f.nom,
              Responsable: `${f.responsable_prenom || ""} ${f.responsable_nom || ""}`.trim() || "—",
              Email: f.responsable_email || "—",
              Telephone: f.responsable_telephone || "—",
              Etat: f.is_active ? "Active" : "Archivée",
              "Date création": new Date(f.created_at).toLocaleDateString("fr-FR"),
            })))}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Exporter
          </button>
          {canCreate && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
              <Plus className="h-4 w-4" /> Ajouter une filiale
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher par nom, responsable..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Responsable</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Téléphone</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">État</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Aucune filiale trouvée
                </td></tr>
              ) : filtered.map(f => (
                <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-card-foreground">{f.nom}</td>
                  <td className="px-6 py-4 text-card-foreground">
                    {f.responsable_prenom || f.responsable_nom
                      ? `${f.responsable_prenom || ""} ${f.responsable_nom || ""}`.trim()
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-card-foreground">{f.responsable_email || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">{f.responsable_telephone || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${f.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
                      {f.is_active ? "Active" : "Archivée"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canCreate && f.is_active && (
                        <button onClick={() => handleArchive(f.id, f.nom)} title="Archiver"
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

      <CreateFilialeDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={loadData}
        entrepriseId={profile?.entreprise_id}
        isSuperadmin={role === "superadmin"}
      />
    </div>
  );
}
