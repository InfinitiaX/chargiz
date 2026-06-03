import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Archive, ArchiveRestore, Building2, Download, Eye, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import CreateFilialeDialog from "@/components/CreateFilialeDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import IconTooltip from "@/components/IconTooltip";
import EmptyState from "@/components/EmptyState";
import PageSkeleton from "@/components/PageSkeleton";
import TablePagination from "@/components/TablePagination";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { exportXLSX } from "@/lib/export";
import { toast } from "sonner";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/dashboard/listes/filiales/")({
  component: ListeFiliales,
  head: () => ({ meta: [{ title: "ChargiZ — Filiales" }] }),
});

interface Filiale {
  id: string;
  nom: string;
  entreprise_id: string;
  siret: string | null;
  numero_tva: string | null;
  telephone: string | null;
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

interface EntrepriseMini { id: string; nom: string }

function ListeFiliales() {
  const { role, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [entreprises, setEntreprises] = useState<Map<string, EntrepriseMini>>(new Map());
  // Filtre entreprise — visible uniquement pour les rôles qui voient plusieurs entreprises
  const [filterEntrepriseId, setFilterEntrepriseId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Dialogs
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Filiale | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Filiale | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Filiale | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canAccess = role === "superadmin" || role === "admin" || role === "gestionnaire_entreprise" || role === "gestionnaire_filiale";
  const canManage = role === "superadmin" || role === "admin" || role === "gestionnaire_entreprise"; // créer, modifier, archiver/désarchiver
  const canHardDelete = role === "superadmin"; // suppression définitive — superadmin uniquement
  // La colonne Entreprise et le filtre n'ont de sens que pour les rôles qui voient plusieurs entreprises
  const showEntrepriseColumn = role === "superadmin" || role === "admin";

  useEffect(() => {
    if (loading || !canAccess) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, canAccess]);

  async function loadData() {
    setDataLoading(true);
    try {
      const [filData, entData] = await Promise.all([
        api.filiales.list(),
        // Seul le superadmin/admin a besoin de la liste des entreprises pour
        // hydrater la colonne et le filtre — les autres rôles voient une seule entreprise.
        showEntrepriseColumn
          ? api.entreprises.list().catch(() => [] as any[])
          : Promise.resolve([] as any[]),
      ]);
      setFiliales(filData);
      setEntreprises(new Map((entData || []).map((e: any) => [e.id, { id: e.id, nom: e.nom }])));
    } catch (err) {
      console.error("Error loading filiales:", err);
    } finally {
      setDataLoading(false);
    }
  }

  async function doArchive() {
    if (!archiveTarget) return;
    setDeleting(true);
    try {
      await api.filiales.archive(archiveTarget.id);  // DELETE = archive (soft delete CDC §2.6.1)
      toast.success(`"${archiveTarget.nom}" archivée`, {
        description: "Les données sont conservées. Vous pourrez la réactiver.",
        duration: 5000,
      });
      setArchiveTarget(null);
      loadData();
    } catch (err: any) {
      toast.error("Archivage impossible", {
        description: err.message || "Une erreur est survenue.",
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setDeleting(false);
    }
  }

  async function doUnarchive(f: Filiale) {
    setProcessingId(f.id);
    try {
      await api.filiales.unarchive(f.id);
      toast.success(`"${f.nom}" réactivée`, { duration: 4000 });
      loadData();
    } catch (err: any) {
      toast.error("Réactivation impossible", {
        description: err.message || "Une erreur est survenue.",
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function doHardDelete() {
    if (!hardDeleteTarget) return;
    setDeleting(true);
    try {
      await api.filiales.hardDelete(hardDeleteTarget.id);
      toast.success(`"${hardDeleteTarget.nom}" supprimée définitivement`, {
        description: "Toutes les données associées ont été effacées.",
        duration: 5000,
      });
      setHardDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error("Suppression impossible", {
        description: err.message || "Une erreur est survenue.",
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setDeleting(false);
    }
  }

  if (loading || dataLoading) return <PageSkeleton kpiCount={0} rowCount={8} />;

  if (!canAccess) {
    return <div className="p-8"><p className="text-muted-foreground">Accès non autorisé.</p></div>;
  }

  const filtered = filiales.filter(f => {
    if (filterEntrepriseId && f.entreprise_id !== filterEntrepriseId) return false;
    if (!search) return true;
    const entNom = entreprises.get(f.entreprise_id)?.nom || "";
    return `${f.nom} ${f.ville || ""} ${f.responsable_nom || ""} ${f.responsable_email || ""} ${entNom}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  // Pagination (BugID_011 — consistance avec collaborateurs/véhicules/entreprises)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Filiales</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez les filiales et leurs gestionnaires</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => exportXLSX("ChargiZ_Filiales", filtered.map(f => ({
              "Nom": f.nom,
              ...(showEntrepriseColumn ? { "Entreprise": entreprises.get(f.entreprise_id)?.nom || "—" } : {}),
              "SIRET": f.siret || "",
              "Adresse": f.adresse || "",
              "Code postal": f.code_postal || "",
              "Ville": f.ville || "",
              "Téléphone": f.telephone || "",
              "État": f.is_active ? "Active" : "Archivée",
              "Date création": new Date(f.created_at).toLocaleDateString("fr-FR"),
            })), "Filiales")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Export Excel
          </button>
          {canManage && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
              <Plus className="h-4 w-4" /> Ajouter une filiale
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher par nom, ville, responsable, entreprise..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        {showEntrepriseColumn && entreprises.size > 0 && (
          <select
            value={filterEntrepriseId}
            onChange={e => { setFilterEntrepriseId(e.target.value); setPage(1); }}
            className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Toutes les entreprises</option>
            {Array.from(entreprises.values())
              .sort((a, b) => a.nom.localeCompare(b.nom))
              .map(e => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
          </select>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="cz-table-head">
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Filiale</th>
                {showEntrepriseColumn && (
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Entreprise</th>
                )}
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Ville</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Responsable</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Téléphone</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">État</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={showEntrepriseColumn ? 7 : 6}>
                    <EmptyState
                      icon={Building2}
                      title={search ? "Aucun résultat" : "Aucune filiale"}
                      description={search ? "Essayez d'autres mots-clés." : "Créez votre première filiale pour structurer votre organisation."}
                      action={!search && canManage ? (
                        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
                          <Plus className="h-4 w-4" /> Ajouter une filiale
                        </button>
                      ) : undefined}
                    />
                  </td>
                </tr>
              ) : paginated.map(f => (
                <tr
                  key={f.id}
                  onClick={() => navigate({ to: "/dashboard/listes/filiales/$id", params: { id: f.id } })}
                  className={`hover:bg-muted/30 transition-colors cursor-pointer ${!f.is_active ? "opacity-60" : ""}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-card-foreground">{f.nom}</span>
                      {f.siret && <span className="text-xs text-muted-foreground font-mono">SIRET : {f.siret}</span>}
                    </div>
                  </td>
                  {showEntrepriseColumn && (
                    <td className="px-6 py-4 text-card-foreground">
                      {(() => {
                        const ent = entreprises.get(f.entreprise_id);
                        if (!ent) return <span className="text-muted-foreground italic">—</span>;
                        return (
                          <Link
                            to="/dashboard/listes/entreprises/$id"
                            params={{ id: ent.id }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:underline"
                          >
                            {ent.nom}
                          </Link>
                        );
                      })()}
                    </td>
                  )}
                  <td className="px-6 py-4 text-card-foreground">{f.ville || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">
                    {f.responsable_prenom || f.responsable_nom
                      ? `${f.responsable_prenom || ""} ${f.responsable_nom || ""}`.trim()
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-card-foreground font-mono text-xs">{f.telephone || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${f.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
                      {f.is_active ? "Active" : "Archivée"}
                    </span>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <IconTooltip label="Voir la fiche">
                        <Link
                          to="/dashboard/listes/filiales/$id"
                          params={{ id: f.id }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </IconTooltip>
                      {canManage && (
                        <>
                          <IconTooltip label="Modifier">
                            <button onClick={() => setEditing(f)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                              <Pencil className="h-4 w-4" />
                            </button>
                          </IconTooltip>
                          {f.is_active ? (
                            <IconTooltip label="Archiver">
                              <button onClick={() => setArchiveTarget(f)} className="rounded-md p-1.5 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 transition-colors">
                                <Archive className="h-4 w-4" />
                              </button>
                            </IconTooltip>
                          ) : (
                            <IconTooltip label="Réactiver">
                              <button
                                onClick={() => doUnarchive(f)}
                                disabled={processingId === f.id}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-chargiz-teal/10 hover:text-chargiz-teal transition-colors disabled:opacity-40"
                              >
                                {processingId === f.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <ArchiveRestore className="h-4 w-4" />}
                              </button>
                            </IconTooltip>
                          )}
                          {canHardDelete && (
                            <IconTooltip label="Supprimer définitivement">
                              <button onClick={() => setHardDeleteTarget(f)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </IconTooltip>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <TablePagination
        page={page}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* Dialog création */}
      <CreateFilialeDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={loadData}
        entrepriseId={profile?.entreprise_id}
        isSuperadmin={role === "superadmin" || role === "admin"}
      />

      {/* Dialog édition (réutilise le même composant en mode editing) */}
      <CreateFilialeDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        onCreated={() => { setEditing(null); loadData(); }}
        entrepriseId={profile?.entreprise_id}
        isSuperadmin={role === "superadmin" || role === "admin"}
        editing={editing}
      />

      {/* Confirmation archivage (soft delete) */}
      <ConfirmDeleteDialog
        open={!!archiveTarget}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
        title={archiveTarget ? `Archiver "${archiveTarget.nom}" ?` : ""}
        description="La filiale et ses données seront archivées mais conservées. Vous pourrez la restaurer ultérieurement."
        onConfirm={doArchive}
        loading={deleting}
        confirmLabel="Archiver"
      />

      {/* Confirmation suppression définitive (hard delete) */}
      <ConfirmDeleteDialog
        open={!!hardDeleteTarget}
        onOpenChange={(open) => { if (!open) setHardDeleteTarget(null); }}
        title={hardDeleteTarget ? `Supprimer définitivement "${hardDeleteTarget.nom}" ?` : ""}
        description="Action irréversible. La filiale, tous ses sites, collaborateurs et véhicules associés seront définitivement supprimés."
        onConfirm={doHardDelete}
        loading={deleting}
        confirmLabel="Supprimer définitivement"
      />
    </div>
  );
}
