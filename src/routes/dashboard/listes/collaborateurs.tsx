import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Archive, Download, Eye, Plus, Search, Upload, Trash2 } from "lucide-react";
import CreateCollaborateurDialog from "@/components/CreateCollaborateurDialog";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { exportCSV } from "@/lib/export";

export const Route = createFileRoute("/dashboard/listes/collaborateurs")({
  component: ListeCollaborateurs,
  head: () => ({ meta: [{ title: "ChargiZ — Collaborateurs" }] }),
});

interface Collab {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  is_active: boolean;
  created_at: string;
  entreprise_id: string;
}

function ListeCollaborateurs() {
  const { profile, role, loading } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const isSuperadmin = role === "superadmin";
  const [collaborateurs, setCollaborateurs] = useState<Collab[]>([]);
  const [entreprises, setEntreprises] = useState<Map<string, any>>(new Map());
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    loadData();
  }, [loading, entrepriseId]);

  async function loadData() {
    const params = entrepriseId ? `?entreprise_id=${entrepriseId}` : "";
    const [collabs, ents] = await Promise.all([
      apiFetch<Collab[]>(`/api/collaborateurs${params}`),
      isSuperadmin ? apiFetch<any[]>("/api/entreprises") : Promise.resolve([] as any[]),
    ]);
    setCollaborateurs(collabs);
    setEntreprises(new Map((ents || []).map((e: any) => [e.id, e])));
  }

  const handleArchive = async (id: string) => {
    if (!confirm("Voulez-vous archiver ce collaborateur ? Ses accès seront suspendus.")) return;
    try {
      await apiFetch(`/api/collaborateurs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: false }),
      });
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'archivage");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous SUPPRIMER définitivement ce collaborateur ? Cette action est irréversible.")) return;
    try {
      await apiFetch(`/api/collaborateurs/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        await apiFetch("/api/collaborateurs/import/csv", {
          method: "POST",
          body: JSON.stringify({ file_content: text }),
        });
        alert("Importation réussie !");
        loadData();
      } catch (err) {
        console.error(err);
        alert("Erreur lors de l'importation. Vérifiez le format du CSV (Nom, Prénom, Email, Téléphone).");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const filtered = collaborateurs.filter((collab) =>
    !search || `${collab.nom} ${collab.prenom} ${collab.email}`.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Collaborateurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez vos équipes et leurs accès</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          <button onClick={handleImportClick} disabled={importing} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
            <Upload className="h-4 w-4" /> {importing ? "Import..." : "Importer CSV"}
          </button>
          <button onClick={() => exportCSV("collaborateurs", filtered.map((collab) => ({
            Nom: collab.nom,
            Prenom: collab.prenom,
            Email: collab.email,
            Telephone: collab.telephone || "",
            Etat: collab.is_active ? "Actif" : "Archive",
            "Date creation": new Date(collab.created_at).toLocaleDateString("fr-FR"),
          })))} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Exporter
          </button>
          {entrepriseId && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
              <Plus className="h-4 w-4" /> Ajouter un collaborateur
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Collaborateur</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Email</th>
                {isSuperadmin && <th className="px-6 py-3 text-left font-medium text-muted-foreground">Entreprise</th>}
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Téléphone</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">État</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={isSuperadmin ? 6 : 5} className="px-6 py-12 text-center text-muted-foreground">Aucun collaborateur trouvé</td></tr>
              ) : filtered.map((collab) => {
                const ent = isSuperadmin ? entreprises.get(collab.entreprise_id) : null;
                return (
                <tr key={collab.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-card-foreground">{collab.prenom} {collab.nom}</span>
                      <span className="text-xs text-muted-foreground">Inscrit le {new Date(collab.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-card-foreground">{collab.email}</td>
                  {isSuperadmin && (
                    <td className="px-6 py-4">
                      {ent ? (
                        <Link to="/dashboard/listes/entreprises/$id" params={{ id: ent.id }} className="text-card-foreground hover:underline">
                          {ent.nom}
                        </Link>
                      ) : <span className="text-muted-foreground italic text-xs">—</span>}
                    </td>
                  )}
                  <td className="px-6 py-4 text-card-foreground">{collab.telephone || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${collab.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
                      {collab.is_active ? "Actif" : "Archivé"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to="/dashboard/collaborateur/$id" params={{ id: collab.id }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Voir fiche">
                        <Eye className="h-4 w-4" />
                      </Link>
                      {collab.is_active ? (
                        <button onClick={() => handleArchive(collab.id)} title="Archiver" className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Archive className="h-4 w-4" />
                        </button>
                      ) : (
                        <button onClick={() => handleDelete(collab.id)} title="Supprimer définitivement" className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {entrepriseId && (
        <CreateCollaborateurDialog entrepriseId={entrepriseId} open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />
      )}
    </div>
  );
}
