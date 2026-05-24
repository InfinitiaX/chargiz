import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Archive, ArchiveRestore, Building2, Download, Eye, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import CreateFilialeDialog from "@/components/CreateFilialeDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import EntityDetailsDialog, { type DetailSection } from "@/components/EntityDetailsDialog";
import IconTooltip from "@/components/IconTooltip";
import EmptyState from "@/components/EmptyState";
import PageSkeleton from "@/components/PageSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { exportXLSX } from "@/lib/export";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/listes/filiales")({
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

function ListeFiliales() {
  const { role, profile, loading } = useAuth();
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [search, setSearch] = useState("");
  const [dataLoading, setDataLoading] = useState(true);

  // Dialogs
  const [showAdd, setShowAdd] = useState(false);
  const [viewing, setViewing] = useState<Filiale | null>(null);
  const [editing, setEditing] = useState<Filiale | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Filiale | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Filiale | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canAccess = role === "superadmin" || role === "gestionnaire_entreprise" || role === "gestionnaire_filiale";
  const canManage = role === "superadmin" || role === "gestionnaire_entreprise"; // créer, modifier, archiver/désarchiver
  const canHardDelete = role === "superadmin"; // suppression définitive — superadmin uniquement

  useEffect(() => {
    if (loading || !canAccess) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, canAccess]);

  async function loadData() {
    setDataLoading(true);
    try {
      const data = await api.filiales.list();
      setFiliales(data);
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

  const filtered = filiales.filter(f =>
    !search || `${f.nom} ${f.ville || ""} ${f.responsable_nom || ""} ${f.responsable_email || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  // Construit les sections pour le dialog de visualisation
  const viewSections: DetailSection[] = viewing ? [
    {
      title: "Identification",
      fields: [
        { label: "Nom", value: viewing.nom },
        { label: "SIRET", value: viewing.siret, mono: true },
        { label: "N° TVA", value: viewing.numero_tva, mono: true },
        { label: "État", value: viewing.is_active
          ? <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-chargiz-teal/10 text-chargiz-teal">Active</span>
          : <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">Archivée</span>
        },
      ],
    },
    {
      title: "Coordonnées",
      fields: [
        { label: "Adresse", value: viewing.adresse },
        { label: "Code postal", value: viewing.code_postal },
        { label: "Ville", value: viewing.ville },
        { label: "Téléphone", value: viewing.telephone, mono: true },
      ],
    },
    {
      title: "Responsable",
      fields: [
        { label: "Prénom", value: viewing.responsable_prenom },
        { label: "Nom", value: viewing.responsable_nom },
        { label: "Email", value: viewing.responsable_email },
        { label: "Téléphone direct", value: viewing.responsable_telephone, mono: true },
      ],
    },
    {
      title: "Création",
      fields: [
        { label: "Créée le", value: new Date(viewing.created_at).toLocaleDateString("fr-FR") },
      ],
    },
  ] : [];

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

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher par nom, ville, responsable..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Filiale</th>
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
                  <td colSpan={6}>
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
              ) : filtered.map(f => (
                <tr key={f.id} className={`hover:bg-muted/30 transition-colors ${!f.is_active ? "opacity-60" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-card-foreground">{f.nom}</span>
                      {f.siret && <span className="text-xs text-muted-foreground font-mono">SIRET : {f.siret}</span>}
                    </div>
                  </td>
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
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <IconTooltip label="Voir la fiche">
                        <button onClick={() => setViewing(f)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Eye className="h-4 w-4" />
                        </button>
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

      {/* Dialog création */}
      <CreateFilialeDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={loadData}
        entrepriseId={profile?.entreprise_id}
        isSuperadmin={role === "superadmin"}
      />

      {/* Dialog édition (réutilise le même composant en mode editing) */}
      <CreateFilialeDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        onCreated={() => { setEditing(null); loadData(); }}
        entrepriseId={profile?.entreprise_id}
        isSuperadmin={role === "superadmin"}
        editing={editing}
      />

      {/* Dialog visualisation */}
      <EntityDetailsDialog
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.nom || ""}
        subtitle={viewing?.ville || "Filiale"}
        icon={Building2}
        sections={viewSections}
        footer={canManage && viewing ? (
          <>
            <button onClick={() => setViewing(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              Fermer
            </button>
            <button
              onClick={() => { setEditing(viewing); setViewing(null); }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </button>
          </>
        ) : null}
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
