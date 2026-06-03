import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import CreateVehiculeDialog from "@/components/CreateVehiculeDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import TablePagination from "@/components/TablePagination";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import IconTooltip from "@/components/IconTooltip";
import { AlertCircle, Archive, ArchiveRestore, Car, Download, Edit, Eye, Link2, Plus, Search, Trash2, X } from "lucide-react";
import AssignVehicleDialog from "@/components/AssignVehicleDialog";
import { exportCSV } from "@/lib/export";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { normalizeImmat, getImmatError } from "@/lib/immat";
import ImmatBadge from "@/components/ImmatBadge";
import VehiculeSelector, { type VehiculeSelectorValue } from "@/components/VehiculeSelector";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/dashboard/listes/vehicules/")({
  component: ListeVehicules,
  head: () => ({ meta: [{ title: "ChargiZ — Véhicules" }] }),
});

interface Vehicule {
  id: string;
  marque: string | null;
  modele: string | null;
  vin: string | null;
  immatriculation: string | null;
  capacite_batterie: number | null;
  statut_smartcar: string;
  statut_affectation: string;
  collaborateur_id: string | null;
  entreprise_id: string;
}

function ListeVehicules() {
  const { profile, role, loading } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const isSuperadmin = role === "superadmin";
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [collabs, setCollabs] = useState<Map<string, any>>(new Map());
  const [entreprises, setEntreprises] = useState<Map<string, any>>(new Map());
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterAbo, setFilterAbo] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editVeh, setEditVeh] = useState<Vehicule | null>(null);
  const [assignVeh, setAssignVeh] = useState<Vehicule | null>(null);
  /** ID du véhicule en cours de traitement (archive/unarchive). */
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (loading) return;
    // Pour superadmin pas besoin d'entreprise_id (vue globale)
    if (!isSuperadmin && !entrepriseId) return;
    loadVehicules();
  }, [loading, entrepriseId, isSuperadmin]);

  async function loadVehicules() {
    try {
      const url = isSuperadmin ? "/api/vehicules" : `/api/vehicules?entreprise_id=${entrepriseId}`;
      const [vehs, collabsArr, entreprisesArr] = await Promise.all([
        apiFetch<Vehicule[]>(url),
        apiFetch<any[]>("/api/collaborateurs"),
        isSuperadmin ? apiFetch<any[]>("/api/entreprises") : Promise.resolve([]),
      ]);
      setVehicules(vehs);
      setCollabs(new Map(collabsArr.map((c: any) => [c.id, c])));
      setEntreprises(new Map((entreprisesArr || []).map((e: any) => [e.id, e])));
    } catch (err) {
      console.error("Error loading vehicles:", err);
    }
  }

  function vehLabel(v: Vehicule) {
    return `${v.marque || ""}${v.modele ? " " + v.modele : ""}${v.immatriculation ? " (" + v.immatriculation + ")" : ""}`.trim() || "Véhicule";
  }

  function handleArchive(v: Vehicule) {
    toast("Archiver ce véhicule ?", {
      description: `${vehLabel(v)} sera marqué comme archivé.`,
      icon: <Archive className="h-4 w-4 text-amber-500" />,
      duration: 8000,
      action: { label: "Archiver", onClick: () => doArchive(v) },
      cancel: { label: "Annuler", onClick: () => {} },
    });
  }

  async function doArchive(v: Vehicule) {
    setProcessingId(v.id);
    try {
      await apiFetch(`/api/vehicules/${v.id}`, {
        method: "PATCH",
        body: JSON.stringify({ statut_affectation: "archive" }),
      });
      toast.warning("Véhicule archivé", {
        description: `${vehLabel(v)} a été archivé.`,
        icon: <Archive className="h-4 w-4 text-amber-500" />,
        duration: 4000,
      });
      loadVehicules();
    } catch (err) {
      console.error(err);
      toast.error("Archivage impossible", {
        description: "Une erreur est survenue. Veuillez réessayer.",
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      });
    } finally {
      setProcessingId(null);
    }
  }

  function handleUnarchive(v: Vehicule) {
    toast("Désarchiver ce véhicule ?", {
      description: `${vehLabel(v)} sera remis en service.`,
      icon: <ArchiveRestore className="h-4 w-4 text-chargiz-teal" />,
      duration: 8000,
      action: { label: "Désarchiver", onClick: () => doUnarchive(v) },
      cancel: { label: "Annuler", onClick: () => {} },
    });
  }

  async function doUnarchive(v: Vehicule) {
    setProcessingId(v.id);
    try {
      await apiFetch(`/api/vehicules/${v.id}`, {
        method: "PATCH",
        body: JSON.stringify({ statut_affectation: "non_affecte" }),
      });
      toast.success("Véhicule désarchivé", {
        description: `${vehLabel(v)} est de nouveau disponible.`,
        icon: <ArchiveRestore className="h-4 w-4 text-chargiz-teal" />,
        duration: 4000,
      });
      loadVehicules();
    } catch (err) {
      console.error(err);
      toast.error("Désarchivage impossible", {
        description: "Une erreur est survenue. Veuillez réessayer.",
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/vehicules/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Véhicule supprimé", {
        description: `${vehLabel(deleteTarget)} a été supprimé définitivement.`,
        icon: <Trash2 className="h-4 w-4" />,
        duration: 4000,
      });
      setDeleteTarget(null);
      loadVehicules();
    } catch (err) {
      console.error(err);
      toast.error("Suppression impossible", {
        description: "Une erreur est survenue. Veuillez réessayer.",
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      });
    } finally {
      setDeleting(false);
    }
  }

  const handleEditSave = async () => {
    if (!editVeh) return;
    // CDC §5.1.1.2 — validation immatriculation
    if (editVeh.immatriculation) {
      const err = getImmatError(editVeh.immatriculation);
      if (err) {
        toast.error("Immatriculation invalide", { description: err, duration: 4000 });
        return;
      }
    }
    setSavingEdit(true);
    try {
      await apiFetch(`/api/vehicules/${editVeh.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          marque: editVeh.marque,
          modele: editVeh.modele,
          immatriculation: editVeh.immatriculation,
          vin: editVeh.vin,
          capacite_batterie: editVeh.capacite_batterie,
        }),
      });
      toast.success("Véhicule mis à jour", {
        description: `${vehLabel(editVeh)} a été modifié avec succès.`,
        icon: <Edit className="h-4 w-4" />,
        duration: 4000,
      });
      setEditVeh(null);
      loadVehicules();
    } catch (err) {
      console.error(err);
      toast.error("Modification impossible", {
        description: "Une erreur est survenue. Veuillez réessayer.",
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = vehicules.filter(v => {
    if (search && !`${v.marque} ${v.modele} ${v.immatriculation}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatut && v.statut_affectation !== filterStatut) return false;
    if (filterAbo && v.statut_smartcar !== filterAbo) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  if (loading) {
    return <PageSkeleton kpiCount={0} rowCount={8} />;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Véhicules</h1>
          <p className="mt-1 text-sm text-muted-foreground">Flotte de véhicules électriques</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button onClick={() => exportCSV("vehicules", filtered.map(v => ({
            Marque: v.marque || "", Modèle: v.modele || "", VIN: v.vin || "",
            Immatriculation: v.immatriculation || "",
            "Batterie (kWh)": v.capacite_batterie ?? "",
            "Statut affectation": v.statut_affectation,
            "Statut Smartcar": v.statut_smartcar,
          })))} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Exporter
          </button>
          {role !== "superadmin" && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
              <Plus className="h-4 w-4" /> Ajouter un véhicule
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher par marque, immatriculation..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select value={filterStatut} onChange={handleFilterChange(setFilterStatut)}
            className="flex-1 sm:flex-none rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary">
            <option value="">Tous statuts</option>
            <option value="affecte">Affecté</option>
            <option value="non_affecte">Non affecté</option>
            <option value="archive">Archivé</option>
          </select>
          <select value={filterAbo} onChange={handleFilterChange(setFilterAbo)}
            className="flex-1 sm:flex-none rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary">
            <option value="">Toutes connexions</option>
            <option value="connecte">Connecté</option>
            <option value="suspendu">Suspendu</option>
            <option value="deconnecte">Déconnecté</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="cz-table-head">
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Véhicule</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Immat</th>
                {isSuperadmin && <th className="px-6 py-3 text-left font-medium text-muted-foreground">Entreprise</th>}
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Collaborateur affilié</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Batterie</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Smartcar</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={isSuperadmin ? 8 : 7}>
                    <EmptyState
                      icon={Car}
                      title={search ? "Aucun résultat" : "Aucun véhicule"}
                      description={search ? "Essayez d'autres mots-clés ou réinitialisez la recherche." : "Ajoutez un véhicule pour démarrer le suivi de recharge."}
                      action={!search && entrepriseId ? (
                        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
                          <Plus className="h-4 w-4" /> Ajouter un véhicule
                        </button>
                      ) : undefined}
                    />
                  </td>
                </tr>
              ) : paginated.map(v => {
                const collab = v.collaborateur_id ? collabs.get(v.collaborateur_id) : null;
                const ent = isSuperadmin ? entreprises.get(v.entreprise_id) : null;
                return (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-card-foreground">{v.marque || "—"} {v.modele || ""}</span>
                      <span className="text-xs text-muted-foreground font-mono">{v.vin || "VIN non renseigné"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-card-foreground"><ImmatBadge value={v.immatriculation} /></td>
                  {isSuperadmin && (
                    <td className="px-6 py-4">
                      {ent ? (
                        <Link to="/dashboard/listes/entreprises/$id" params={{ id: ent.id }} className="text-card-foreground hover:underline">
                          {ent.nom}
                        </Link>
                      ) : <span className="text-muted-foreground italic text-xs">—</span>}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    {collab ? (
                      <Link to="/dashboard/collaborateur/$id" params={{ id: collab.id }} className="text-card-foreground hover:underline">
                        {collab.prenom} {collab.nom}
                      </Link>
                    ) : <span className="text-muted-foreground italic text-xs">Non affilié</span>}
                  </td>
                  <td className="px-6 py-4 text-card-foreground">{v.capacite_batterie ? `${v.capacite_batterie} kWh` : "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      v.statut_affectation === "affecte" ? "bg-chargiz-teal/10 text-chargiz-teal"
                      : v.statut_affectation === "archive" ? "bg-muted text-muted-foreground"
                      : "bg-kpi-sessions/10 text-kpi-sessions"
                    }`}>
                      {v.statut_affectation === "affecte" ? "Affecté" : v.statut_affectation === "archive" ? "Archivé" : "Non affecté"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${v.statut_smartcar === "connecte" ? "text-chargiz-teal" : v.statut_smartcar === "suspendu" ? "text-kpi-away" : "text-muted-foreground"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${v.statut_smartcar === "connecte" ? "bg-chargiz-teal" : v.statut_smartcar === "suspendu" ? "bg-kpi-away" : "bg-muted-foreground"}`} />
                      {v.statut_smartcar === "connecte" ? "Connecté" : v.statut_smartcar === "suspendu" ? "Suspendu" : "Déconnecté"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <IconTooltip label="Voir la fiche">
                        <Link to="/dashboard/listes/vehicules/$vehiculeId" params={{ vehiculeId: v.id }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </IconTooltip>
                      <IconTooltip label="Modifier le véhicule">
                        <button
                          onClick={() => setEditVeh({ ...v })}
                          disabled={processingId === v.id}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </IconTooltip>
                      {/* Affecter : visible uniquement si véhicule libre + actif */}
                      {!v.collaborateur_id && v.statut_affectation === "non_affecte" && (
                        <IconTooltip label="Affecter à un collaborateur">
                          <button
                            onClick={() => setAssignVeh(v)}
                            disabled={processingId === v.id}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-chargiz-lime/30 hover:text-chargiz-teal transition-colors disabled:opacity-40"
                          >
                            <Link2 className="h-4 w-4" />
                          </button>
                        </IconTooltip>
                      )}
                      {v.statut_affectation === "archive" ? (
                        <IconTooltip label="Désarchiver">
                          <button
                            onClick={() => handleUnarchive(v)}
                            disabled={processingId === v.id}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-chargiz-teal/10 hover:text-chargiz-teal transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {processingId === v.id
                              ? <span className="h-4 w-4 block animate-spin rounded-full border-2 border-chargiz-teal border-t-transparent" />
                              : <ArchiveRestore className="h-4 w-4" />}
                          </button>
                        </IconTooltip>
                      ) : (
                        <IconTooltip label="Archiver">
                          <button
                            onClick={() => handleArchive(v)}
                            disabled={processingId === v.id}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {processingId === v.id
                              ? <span className="h-4 w-4 block animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                              : <Archive className="h-4 w-4" />}
                          </button>
                        </IconTooltip>
                      )}
                      <IconTooltip label="Supprimer définitivement">
                        <button
                          onClick={() => setDeleteTarget(v)}
                          disabled={processingId === v.id}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </IconTooltip>
                    </div>
                  </td>
                </tr>
                );
              })}
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

      {entrepriseId && <CreateVehiculeDialog entrepriseId={entrepriseId} open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadVehicules} />}

      {/* Affectation à un collaborateur */}
      {assignVeh && (
        <AssignVehicleDialog
          open={!!assignVeh}
          onClose={() => setAssignVeh(null)}
          mode="from-vehicule"
          vehicule={{
            id: assignVeh.id,
            marque: assignVeh.marque,
            modele: assignVeh.modele,
            immatriculation: assignVeh.immatriculation,
            entreprise_id: assignVeh.entreprise_id,
          }}
          onAssigned={() => { setAssignVeh(null); loadVehicules(); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={deleteTarget ? `Supprimer ${vehLabel(deleteTarget)} ?` : ""}
        description="Cette action est irréversible. Toutes les sessions de recharge associées seront définitivement perdues."
        onConfirm={doDelete}
        loading={deleting}
      />

      {/* Edit Dialog */}
      {editVeh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-card-foreground">Modifier le véhicule</h2>
              <button onClick={() => setEditVeh(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              {/* Sélecteur véhicule depuis base EV (marque/modèle/capacité auto) */}
              <VehiculeSelector
                value={{
                  marque: editVeh.marque || "",
                  modele: editVeh.modele || "",
                  capacite_batterie: editVeh.capacite_batterie ?? null,
                } as VehiculeSelectorValue}
                onChange={(v) => setEditVeh({
                  ...editVeh,
                  marque: v.marque,
                  modele: v.modele,
                  capacite_batterie: v.capacite_batterie,
                })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Immatriculation</label>
                  <input
                    className={`${inputCls} font-mono uppercase tracking-wide`}
                    value={editVeh.immatriculation || ""}
                    maxLength={9}
                    placeholder="AB-123-CD"
                    onChange={e => setEditVeh({
                      ...editVeh,
                      immatriculation: normalizeImmat(e.target.value),
                    })}
                  />
                  {(() => {
                    const err = editVeh.immatriculation ? getImmatError(editVeh.immatriculation) : null;
                    return err ? <p className="mt-1 text-[11px] text-destructive">{err}</p> : null;
                  })()}
                </div>
                <div><label className="text-sm font-medium text-foreground">VIN</label><input className={inputCls} value={editVeh.vin || ""} onChange={e => setEditVeh({ ...editVeh, vin: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditVeh(null)} disabled={savingEdit} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">Annuler</button>
                <button onClick={handleEditSave} disabled={savingEdit} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50">
                  {savingEdit && <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />}
                  {savingEdit ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
