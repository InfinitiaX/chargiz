import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api, apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import CreateEntrepriseDialog from "@/components/CreateEntrepriseDialog";
import TablePagination from "@/components/TablePagination";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import IconTooltip from "@/components/IconTooltip";
import { Plus, Search, Eye, Pencil, Archive, ArchiveRestore, Trash2, Download, Building2, AlertCircle } from "lucide-react";
import { exportXLSX } from "@/lib/export";
import { toast } from "sonner";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/dashboard/listes/entreprises/")({
  component: ListeEntreprises,
  head: () => ({ meta: [{ title: "ChargiZ — Entreprises" }] }),
});

interface Entreprise {
  id: string;
  nom: string;
  siren: string | null;
  siret: string | null;
  numero_tva: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  email: string | null;
  telephone: string | null;
  created_at: string;
  is_active: boolean;
}

function ListeEntreprises() {
  const { role, loading } = useAuth();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<"all" | "active" | "archived">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Entreprise | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Entreprise | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);

  const canAccess = role === "superadmin" || role === "admin" || role === "gestionnaire_entreprise";
  const canManage = role === "superadmin"; // créer, modifier, archiver, supprimer définitivement

  useEffect(() => {
    if (loading || !canAccess) return;
    loadData();
  }, [loading, canAccess]);

  async function loadData() {
    try {
      const data = await api.entreprises.list();
      setEntreprises(data);
    } catch (err) {
      console.error("Error loading entreprises:", err);
    }
  }

  async function doArchive(e: Entreprise) {
    setArchivingId(e.id);
    try {
      await apiFetch(`/api/entreprises/${e.id}/archive`, { method: "PATCH" });
      toast.success("Entreprise archivée", {
        description: `${e.nom} et tous ses utilisateurs ont été suspendus.`,
        duration: 5000,
      });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'archivage");
    } finally {
      setArchivingId(null);
    }
  }

  function handleArchive(e: Entreprise) {
    toast.warning(`Archiver "${e.nom}" ?`, {
      description: "Tous les accès seront suspendus — gestionnaires et collaborateurs inclus.",
      duration: 8000,
      action: {
        label: "Confirmer",
        onClick: () => doArchive(e),
      },
      cancel: {
        label: "Annuler",
        onClick: () => {},
      },
    });
  }

  async function handleUnarchive(e: Entreprise) {
    setArchivingId(e.id);
    try {
      await apiFetch(`/api/entreprises/${e.id}/unarchive`, { method: "PATCH" });
      toast.success("Entreprise réactivée", {
        description: `${e.nom} et tous ses utilisateurs ont été réactivés.`,
        duration: 5000,
      });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la réactivation");
    } finally {
      setArchivingId(null);
    }
  }

  async function doHardDelete() {
    if (!hardDeleteTarget) return;
    setDeleting(true);
    try {
      await api.entreprises.delete(hardDeleteTarget.id);
      toast.success(`"${hardDeleteTarget.nom}" supprimée définitivement`, {
        description: "Toutes les données associées (filiales, sites, collaborateurs, véhicules, sessions) ont été effacées.",
        duration: 6000,
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

  if (loading) {
    return <PageSkeleton kpiCount={0} rowCount={6} />;
  }

  if (!canAccess) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <p className="text-muted-foreground">Accès non autorisé.</p>
      </div>
    );
  }

  const filtered = entreprises.filter(e => {
    if (filterStatut === "active" && !e.is_active) return false;
    if (filterStatut === "archived" && e.is_active) return false;
    if (search && !`${e.nom} ${e.siren || ""} ${e.ville || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = entreprises.filter(e => e.is_active).length;
  const archivedCount = entreprises.filter(e => !e.is_active).length;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Entreprises</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filterStatut === "archived" ? (
              <>{archivedCount} archivée{archivedCount > 1 ? "s" : ""}
                {activeCount > 0 && <span className="text-muted-foreground/60"> · {activeCount} active{activeCount > 1 ? "s" : ""}</span>}
              </>
            ) : (
              <>{activeCount} active{activeCount > 1 ? "s" : ""}
                {archivedCount > 0 && <span className="text-muted-foreground/60"> · {archivedCount} archivée{archivedCount > 1 ? "s" : ""}</span>}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => exportXLSX("ChargiZ_Entreprises", filtered.map(e => ({
              "Nom": e.nom,
              "SIREN": e.siren || "",
              "SIRET": e.siret || "",
              "N° TVA": e.numero_tva || "",
              "Adresse": e.adresse || "",
              "Code postal": e.code_postal || "",
              "Ville": e.ville || "",
              "Téléphone": e.telephone || "",
              "Email": e.email || "",
              "État": e.is_active ? "Active" : "Archivée",
              "Date création": new Date(e.created_at).toLocaleDateString("fr-FR"),
            })), "Entreprises")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Download className="h-4 w-4" /> Export Excel
          </button>
          {(role === "superadmin" || role === "admin") && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light"
            >
              <Plus className="h-4 w-4" /> Ajouter une entreprise
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, ville..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {(["all", "active", "archived"] as const).map(s => (
            <button
              key={s}
              onClick={() => { setFilterStatut(s); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filterStatut === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s === "all" ? "Toutes" : s === "active" ? "Actives" : "Archivées"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="cz-table-head">
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Entreprise</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">SIREN</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Ville</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">État</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Créée le</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    {(() => {
                      // Titre / description / bouton adaptés au contexte
                      let title: string;
                      let description: string;
                      let showCreateButton = false;
                      if (search) {
                        title = "Aucun résultat";
                        description = "Essayez d'autres mots-clés ou réinitialisez la recherche.";
                      } else if (filterStatut === "archived") {
                        title = "Aucune entreprise archivée";
                        description = "Aucune entreprise n'a été archivée pour le moment.";
                      } else if (filterStatut === "active") {
                        title = "Aucune entreprise active";
                        description = "Toutes vos entreprises sont actuellement archivées. Créez-en une nouvelle ou désarchivez-en depuis l'onglet « Archivées ».";
                        showCreateButton = role === "superadmin" || role === "admin";
                      } else {
                        title = "Aucune entreprise";
                        description = "Créez votre première entreprise pour démarrer le suivi de votre flotte.";
                        showCreateButton = role === "superadmin" || role === "admin";
                      }
                      return (
                        <EmptyState
                          icon={Building2}
                          title={title}
                          description={description}
                          action={showCreateButton ? (
                            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
                              <Plus className="h-4 w-4" /> Ajouter une entreprise
                            </button>
                          ) : undefined}
                        />
                      );
                    })()}
                  </td>
                </tr>
              ) : paginated.map(e => (
                <tr
                  key={e.id}
                  className={`transition-colors ${e.is_active ? "hover:bg-muted/30" : "bg-muted/20 opacity-70 hover:opacity-100 hover:bg-muted/30"}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${e.is_active ? "bg-primary/10" : "bg-muted"}`}>
                        <Building2 className={`h-4 w-4 ${e.is_active ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <span className={`font-medium ${e.is_active ? "text-card-foreground" : "text-muted-foreground line-through decoration-muted-foreground/40"}`}>
                        {e.nom}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-card-foreground">{e.siren || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">{e.ville || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">{e.email || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      e.is_active
                        ? "bg-chargiz-teal/10 text-chargiz-teal"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${e.is_active ? "bg-chargiz-teal" : "bg-destructive"}`} />
                      {e.is_active ? "Active" : "Archivée"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-card-foreground">
                    {new Date(e.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <IconTooltip label="Voir la fiche">
                        <Link
                          to="/dashboard/listes/entreprises/$id"
                          params={{ id: e.id }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </IconTooltip>
                      {canManage && (
                        <>
                          <IconTooltip label="Modifier">
                            <button onClick={() => setEditing(e)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                              <Pencil className="h-4 w-4" />
                            </button>
                          </IconTooltip>
                          {e.is_active ? (
                            <IconTooltip label="Archiver">
                              <button
                                onClick={() => handleArchive(e)}
                                disabled={archivingId === e.id}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 transition-colors disabled:opacity-40"
                              >
                                {archivingId === e.id
                                  ? <span className="h-4 w-4 block rounded-full border-2 border-current/30 border-t-current animate-spin" />
                                  : <Archive className="h-4 w-4" />}
                              </button>
                            </IconTooltip>
                          ) : (
                            <IconTooltip label="Réactiver">
                              <button
                                onClick={() => handleUnarchive(e)}
                                disabled={archivingId === e.id}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-chargiz-teal/10 hover:text-chargiz-teal transition-colors disabled:opacity-40"
                              >
                                {archivingId === e.id
                                  ? <span className="h-4 w-4 block rounded-full border-2 border-current/30 border-t-current animate-spin" />
                                  : <ArchiveRestore className="h-4 w-4" />}
                              </button>
                            </IconTooltip>
                          )}
                          <IconTooltip label="Supprimer définitivement">
                            <button onClick={() => setHardDeleteTarget(e)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </IconTooltip>
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

      <TablePagination
        page={page}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* Création */}
      <CreateEntrepriseDialog open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />

      {/* Édition (réutilise le même composant en mode editing) */}
      <CreateEntrepriseDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        onCreated={() => { setEditing(null); loadData(); }}
        editing={editing}
      />

      {/* Suppression définitive */}
      <ConfirmDeleteDialog
        open={!!hardDeleteTarget}
        onOpenChange={(open) => { if (!open) setHardDeleteTarget(null); }}
        title={hardDeleteTarget ? `Supprimer définitivement "${hardDeleteTarget.nom}" ?` : ""}
        description="Action irréversible. Tout sera effacé : filiales, sites, collaborateurs, véhicules et historique de recharges. Préférez l'archivage si vous souhaitez juste désactiver l'entreprise."
        onConfirm={doHardDelete}
        loading={deleting}
        confirmLabel="Supprimer définitivement"
      />
    </div>
  );
}
