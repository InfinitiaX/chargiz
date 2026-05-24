import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, ShieldAlert, ShieldCheck, UserPlus, Building2, Trash2,
  Archive, ArchiveRestore, Search, ArrowLeftRight, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import IconTooltip from "@/components/IconTooltip";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import SectionHeader from "@/components/SectionHeader";
import CreateAdminDialog from "@/components/CreateAdminDialog";
import AdminAssignDialog from "@/components/AdminAssignDialog";
import AdminMutationDialog from "@/components/AdminMutationDialog";

export const Route = createFileRoute("/dashboard/administration/admins")({
  component: AdminsPage,
  head: () => ({ meta: [{ title: "ChargiZ — Admins" }] }),
});

interface AdminItem {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string | null;
  nb_entreprises: number;
}

function AdminsPage() {
  const { role } = useAuth();
  const isSuperadmin = role === "superadmin";

  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [assigning, setAssigning] = useState<AdminItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showMutation, setShowMutation] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isSuperadmin) { setLoading(false); return; }
    loadData();
  }, [isSuperadmin]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await api.admins.list();
      setAdmins(data);
    } catch (err) {
      console.error("Erreur chargement admins:", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(admin: AdminItem) {
    setProcessingId(admin.id);
    try {
      await api.admins.update(admin.id, { is_active: !admin.is_active });
      toast.success(admin.is_active ? "Admin désactivé" : "Admin réactivé");
      loadData();
    } catch (err: any) {
      toast.error("Action impossible", { description: err.message, icon: <AlertCircle className="h-4 w-4" /> });
    } finally {
      setProcessingId(null);
    }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.admins.delete(deleteTarget.id);
      toast.success(`Admin "${deleteTarget.full_name || deleteTarget.email}" supprimé`, {
        description: "Toutes ses attributions d'entreprises ont été révoquées.",
        duration: 5000,
      });
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error("Suppression impossible", { description: err.message, icon: <AlertCircle className="h-4 w-4" /> });
    } finally {
      setDeleting(false);
    }
  }

  if (!isSuperadmin) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 max-w-xl">
          <ShieldAlert className="h-6 w-6 text-destructive mb-2" />
          <p className="text-sm font-semibold text-destructive">Accès réservé</p>
          <p className="mt-1 text-sm text-muted-foreground">
            La gestion des administrateurs est accessible uniquement aux super-administrateurs.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <PageSkeleton kpiCount={0} rowCount={6} />;

  const filtered = admins.filter(a =>
    !search || `${a.full_name || ""} ${a.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/dashboard/administration" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3 w-3" /> Retour
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Administrateurs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Comptes opérationnels internes avec accès aux entreprises clientes qui leur sont attribuées.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {admins.length >= 2 && (
            <button
              onClick={() => setShowMutation(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              <ArrowLeftRight className="h-4 w-4" /> Mutation
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light"
          >
            <UserPlus className="h-4 w-4" /> Nouvel admin
          </button>
        </div>
      </div>

      <SectionHeader>Liste des administrateurs</SectionHeader>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Admin</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Entreprises</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">État</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Créé le</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={ShieldCheck}
                      title={search ? "Aucun résultat" : "Aucun administrateur"}
                      description={search ? "Essayez d'autres mots-clés." : "Créez le premier compte administrateur pour déléguer la gestion opérationnelle."}
                      action={!search ? (
                        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
                          <UserPlus className="h-4 w-4" /> Nouvel admin
                        </button>
                      ) : undefined}
                    />
                  </td>
                </tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-card-foreground">{a.full_name || "—"}</span>
                      <span className="text-xs text-muted-foreground">@{a.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-card-foreground">{a.email}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setAssigning(a)}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/15"
                    >
                      <Building2 className="h-3 w-3" />
                      {a.nb_entreprises} {a.nb_entreprises > 1 ? "entreprises" : "entreprise"}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${a.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${a.is_active ? "bg-chargiz-teal" : "bg-destructive"}`} />
                      {a.is_active ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-card-foreground text-xs">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <IconTooltip label="Gérer les entreprises">
                        <button
                          onClick={() => setAssigning(a)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Building2 className="h-4 w-4" />
                        </button>
                      </IconTooltip>
                      {a.is_active ? (
                        <IconTooltip label="Désactiver">
                          <button
                            onClick={() => toggleActive(a)}
                            disabled={processingId === a.id}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 transition-colors disabled:opacity-40"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </IconTooltip>
                      ) : (
                        <IconTooltip label="Réactiver">
                          <button
                            onClick={() => toggleActive(a)}
                            disabled={processingId === a.id}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-chargiz-teal/10 hover:text-chargiz-teal transition-colors disabled:opacity-40"
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </button>
                        </IconTooltip>
                      )}
                      <IconTooltip label="Supprimer définitivement">
                        <button
                          onClick={() => setDeleteTarget(a)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </IconTooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateAdminDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); loadData(); }}
      />

      {assigning && (
        <AdminAssignDialog
          open={!!assigning}
          admin={assigning}
          onClose={() => setAssigning(null)}
          onUpdated={() => { setAssigning(null); loadData(); }}
        />
      )}

      {admins.length >= 2 && (
        <AdminMutationDialog
          open={showMutation}
          admins={admins}
          onClose={() => setShowMutation(false)}
          onCompleted={() => { setShowMutation(false); loadData(); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={deleteTarget ? `Supprimer ${deleteTarget.full_name || deleteTarget.email} ?` : ""}
        description="Action irréversible. Le compte admin et toutes ses attributions d'entreprises seront supprimés. Les entreprises clientes elles-mêmes restent intactes."
        onConfirm={doDelete}
        loading={deleting}
        confirmLabel="Supprimer définitivement"
      />
    </div>
  );
}
