import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Archive, ArchiveRestore, Download, Eye, Loader2, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
import CreateSiteDialog from "@/components/CreateSiteDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import EntityDetailsDialog, { type DetailSection } from "@/components/EntityDetailsDialog";
import IconTooltip from "@/components/IconTooltip";
import EmptyState from "@/components/EmptyState";
import PageSkeleton from "@/components/PageSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { exportXLSX } from "@/lib/export";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/listes/sites")({
  component: ListeSites,
  head: () => ({ meta: [{ title: "ChargiZ — Sites" }] }),
});

interface Site {
  id: string;
  nom: string;
  filiale_id: string;
  siret: string | null;
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
  const [dataLoading, setDataLoading] = useState(true);

  // Dialogs
  const [showAdd, setShowAdd] = useState(false);
  const [viewing, setViewing] = useState<Site | null>(null);
  const [editing, setEditing] = useState<Site | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Site | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Site | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canAccess =
    role === "superadmin" ||
    role === "gestionnaire_entreprise" ||
    role === "gestionnaire_filiale" ||
    role === "gestionnaire_site";
  // Voir = tous, Modifier/Archiver/Désarchiver = sup + gest. entreprise + filiale
  const canManage = role === "superadmin" || role === "gestionnaire_entreprise" || role === "gestionnaire_filiale";
  // Suppression définitive = superadmin uniquement
  const canHardDelete = role === "superadmin";

  useEffect(() => {
    if (loading || !canAccess) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, canAccess]);

  async function loadData() {
    setDataLoading(true);
    try {
      const [sitesData, filialesData] = await Promise.all([
        api.sites.list(),
        api.filiales.list(),
      ]);
      setSites(sitesData);
      setFiliales(filialesData);
    } catch (err) {
      console.error("Error loading sites/filiales:", err);
    } finally {
      setDataLoading(false);
    }
  }

  async function doArchive() {
    if (!archiveTarget) return;
    setDeleting(true);
    try {
      await api.sites.archive(archiveTarget.id);
      toast.success(`Site "${archiveTarget.nom}" archivé`, {
        description: "Les données sont conservées. Vous pourrez le réactiver.",
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

  async function doUnarchive(s: Site) {
    setProcessingId(s.id);
    try {
      await api.sites.unarchive(s.id);
      toast.success(`Site "${s.nom}" réactivé`, { duration: 4000 });
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
      await api.sites.hardDelete(hardDeleteTarget.id);
      toast.success(`Site "${hardDeleteTarget.nom}" supprimé définitivement`, {
        description: "Les collaborateurs rattachés ont été détachés (conservés sur la filiale).",
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

  const filialeName = (id: string) => filiales.find(f => f.id === id)?.nom || "—";

  if (loading || dataLoading) return <PageSkeleton kpiCount={0} rowCount={8} />;

  if (!canAccess) {
    return <div className="p-8"><p className="text-muted-foreground">Accès non autorisé.</p></div>;
  }

  const filtered = sites.filter(s => {
    if (filterFilialeId && s.filiale_id !== filterFilialeId) return false;
    if (!search) return true;
    return `${s.nom} ${s.ville || ""} ${s.responsable_email || ""}`.toLowerCase().includes(search.toLowerCase());
  });

  // Sections du dialog de visualisation
  const viewSections: DetailSection[] = viewing ? [
    {
      title: "Identification",
      fields: [
        { label: "Nom du site", value: viewing.nom },
        { label: "Filiale", value: filialeName(viewing.filiale_id) },
        { label: "SIRET", value: viewing.siret, mono: true },
        { label: "État", value: viewing.is_active
          ? <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-chargiz-teal/10 text-chargiz-teal">Actif</span>
          : <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">Archivé</span>
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
        { label: "Créé le", value: new Date(viewing.created_at).toLocaleDateString("fr-FR") },
      ],
    },
  ] : [];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Sites</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez les sites et leurs gestionnaires</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => exportXLSX("ChargiZ_Sites", filtered.map(s => ({
              "Nom": s.nom,
              "Filiale": filialeName(s.filiale_id),
              "SIRET": s.siret || "",
              "Adresse": s.adresse || "",
              "Code postal": s.code_postal || "",
              "Ville": s.ville || "",
              "Téléphone": s.telephone || "",
              "État": s.is_active ? "Actif" : "Archivé",
              "Date création": new Date(s.created_at).toLocaleDateString("fr-FR"),
            })), "Sites")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Export Excel
          </button>
          {canManage && (
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
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Site</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Filiale</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Ville</th>
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
                      icon={MapPin}
                      title={search ? "Aucun résultat" : "Aucun site"}
                      description={search ? "Essayez d'autres mots-clés." : "Créez un site pour organiser votre activité."}
                      action={!search && canManage ? (
                        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
                          <Plus className="h-4 w-4" /> Ajouter un site
                        </button>
                      ) : undefined}
                    />
                  </td>
                </tr>
              ) : filtered.map(s => (
                <tr key={s.id} className={`hover:bg-muted/30 transition-colors ${!s.is_active ? "opacity-60" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-card-foreground">{s.nom}</span>
                      {s.adresse && <span className="text-xs text-muted-foreground">{s.adresse}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-card-foreground">{filialeName(s.filiale_id)}</td>
                  <td className="px-6 py-4 text-card-foreground">
                    {s.ville ? `${s.ville}${s.code_postal ? ` (${s.code_postal})` : ""}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-card-foreground font-mono text-xs">{s.telephone || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
                      {s.is_active ? "Actif" : "Archivé"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <IconTooltip label="Voir la fiche">
                        <button onClick={() => setViewing(s)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Eye className="h-4 w-4" />
                        </button>
                      </IconTooltip>
                      {canManage && (
                        <>
                          <IconTooltip label="Modifier">
                            <button onClick={() => setEditing(s)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                              <Pencil className="h-4 w-4" />
                            </button>
                          </IconTooltip>
                          {s.is_active ? (
                            <IconTooltip label="Archiver">
                              <button onClick={() => setArchiveTarget(s)} className="rounded-md p-1.5 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 transition-colors">
                                <Archive className="h-4 w-4" />
                              </button>
                            </IconTooltip>
                          ) : (
                            <IconTooltip label="Réactiver">
                              <button
                                onClick={() => doUnarchive(s)}
                                disabled={processingId === s.id}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-chargiz-teal/10 hover:text-chargiz-teal transition-colors disabled:opacity-40"
                              >
                                {processingId === s.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <ArchiveRestore className="h-4 w-4" />}
                              </button>
                            </IconTooltip>
                          )}
                          {canHardDelete && (
                            <IconTooltip label="Supprimer définitivement">
                              <button onClick={() => setHardDeleteTarget(s)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
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

      {/* Création */}
      <CreateSiteDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={loadData}
        filialeId={role === "gestionnaire_filiale" && filiales[0] ? filiales[0].id : null}
        selectableFiliales={filiales}
      />

      {/* Édition */}
      <CreateSiteDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        onCreated={() => { setEditing(null); loadData(); }}
        filialeId={editing?.filiale_id}
        selectableFiliales={filiales}
        editing={editing}
      />

      {/* Visualisation */}
      <EntityDetailsDialog
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.nom || ""}
        subtitle={viewing ? filialeName(viewing.filiale_id) : "Site"}
        icon={MapPin}
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

      {/* Archivage (soft) */}
      <ConfirmDeleteDialog
        open={!!archiveTarget}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
        title={archiveTarget ? `Archiver "${archiveTarget.nom}" ?` : ""}
        description="Le site et ses données seront archivés mais conservés. Vous pourrez le restaurer ultérieurement."
        onConfirm={doArchive}
        loading={deleting}
        confirmLabel="Archiver"
      />

      {/* Suppression définitive (hard) */}
      <ConfirmDeleteDialog
        open={!!hardDeleteTarget}
        onOpenChange={(open) => { if (!open) setHardDeleteTarget(null); }}
        title={hardDeleteTarget ? `Supprimer définitivement "${hardDeleteTarget.nom}" ?` : ""}
        description="Action irréversible. Le site sera définitivement supprimé. Les collaborateurs rattachés seront détachés (conservés sur leur filiale)."
        onConfirm={doHardDelete}
        loading={deleting}
        confirmLabel="Supprimer définitivement"
      />
    </div>
  );
}
