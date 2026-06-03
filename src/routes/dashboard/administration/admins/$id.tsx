import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, ShieldAlert, ShieldCheck, Building2, Trash2, Archive, ArchiveRestore,
  Mail, Calendar, Save, X, Plus, AlertCircle, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import PageSkeleton from "@/components/PageSkeleton";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

export const Route = createFileRoute("/dashboard/administration/admins/$id")({
  component: AdminDetailPage,
  head: () => ({ meta: [{ title: "ChargiZ — Détail admin" }] }),
});

interface AdminItem {
  id: number; email: string; username: string; full_name: string | null;
  is_active: boolean; created_at: string | null; nb_entreprises: number;
}
interface Ent { id: string; nom: string; ville?: string | null; is_active?: boolean; assigned_at?: string | null; }

function AdminDetailPage() {
  const { id } = useParams({ from: "/dashboard/administration/admins/$id" });
  const adminId = Number(id);
  const { role } = useAuth();
  const isSuperadmin = role === "superadmin";
  const navigate = useNavigate();

  const [admin, setAdmin] = useState<AdminItem | null>(null);
  const [assigned, setAssigned] = useState<Ent[]>([]);
  const [allEnts, setAllEnts] = useState<Ent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [addSel, setAddSel] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isSuperadmin) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperadmin, adminId]);

  async function load() {
    setLoading(true);
    try {
      const [list, ents, all] = await Promise.all([
        api.admins.list(),
        api.admins.listEntreprises(adminId),
        api.entreprises.list(),
      ]);
      const a = (list as AdminItem[]).find((x) => x.id === adminId) || null;
      setAdmin(a);
      setNameDraft(a?.full_name || "");
      setAssigned(ents as Ent[]);
      setAllEnts(all as Ent[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function saveName() {
    if (!admin) return;
    setSaving(true);
    try {
      await api.admins.update(admin.id, { full_name: nameDraft.trim() });
      toast.success("Nom mis à jour");
      setEditingName(false);
      await load();
    } catch (e: any) {
      toast.error("Échec de la mise à jour", { description: e.message, icon: <AlertCircle className="h-4 w-4" /> });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!admin) return;
    setProcessing(true);
    try {
      await api.admins.update(admin.id, { is_active: !admin.is_active });
      toast.success(admin.is_active ? "Admin désactivé" : "Admin réactivé");
      await load();
    } catch (e: any) {
      toast.error("Action impossible", { description: e.message, icon: <AlertCircle className="h-4 w-4" /> });
    } finally {
      setProcessing(false);
    }
  }

  async function unassign(entId: string) {
    setProcessing(true);
    try {
      const remaining = assigned.filter((e) => e.id !== entId).map((e) => e.id);
      await api.admins.setEntreprises(adminId, remaining);
      toast.success("Entreprise retirée du portefeuille");
      await load();
    } catch (e: any) {
      toast.error("Retrait impossible", { description: e.message, icon: <AlertCircle className="h-4 w-4" /> });
    } finally {
      setProcessing(false);
    }
  }

  async function assign() {
    if (!addSel) return;
    setProcessing(true);
    try {
      const ids = [...assigned.map((e) => e.id), addSel];
      await api.admins.setEntreprises(adminId, ids);
      toast.success("Entreprise attribuée");
      setAddSel("");
      await load();
    } catch (e: any) {
      toast.error("Attribution impossible", { description: e.message, icon: <AlertCircle className="h-4 w-4" /> });
    } finally {
      setProcessing(false);
    }
  }

  async function doDelete() {
    if (!admin) return;
    setDeleting(true);
    try {
      await api.admins.delete(admin.id);
      toast.success("Admin supprimé");
      navigate({ to: "/dashboard/administration/admins" });
    } catch (e: any) {
      toast.error("Suppression impossible", { description: e.message, icon: <AlertCircle className="h-4 w-4" /> });
      setDeleting(false);
    }
  }

  if (!isSuperadmin) {
    return (
      <div className="p-8">
        <div className="max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <ShieldAlert className="mb-2 h-6 w-6 text-destructive" />
          <p className="text-sm font-semibold text-destructive">Accès réservé</p>
          <p className="mt-1 text-sm text-muted-foreground">La gestion des administrateurs est réservée aux super-administrateurs.</p>
        </div>
      </div>
    );
  }

  if (loading) return <PageSkeleton kpiCount={0} rowCount={5} />;

  if (!admin) {
    return (
      <div className="p-8">
        <Link to="/dashboard/administration/admins" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Retour aux admins
        </Link>
        <p className="text-sm text-muted-foreground">Administrateur introuvable.</p>
      </div>
    );
  }

  const assignedIds = new Set(assigned.map((e) => e.id));
  const available = allEnts.filter((e) => !assignedIds.has(e.id));

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Breadcrumb */}
      <Link to="/dashboard/administration/admins" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Administrateurs
      </Link>

      {/* En-tête identité */}
      <div className="mb-6 overflow-hidden rounded-xl border border-border border-b-2 border-b-[#0f4b49] bg-card shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f4b49]/10">
              <ShieldCheck className="h-6 w-6 text-[#0f4b49]" />
            </div>
            <div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm shadow-sm outline-none transition-all focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20"
                    placeholder="Nom complet"
                    autoFocus
                  />
                  <button onClick={saveName} disabled={saving} className="rounded-md bg-[#0f4b49] p-1.5 text-white hover:bg-[#0d3f3d] disabled:opacity-60">
                    <Save className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setEditingName(false); setNameDraft(admin.full_name || ""); }} className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">{admin.full_name || "—"}</h1>
                  <button onClick={() => setEditingName(true)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Modifier le nom">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${admin.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${admin.is_active ? "bg-chargiz-teal" : "bg-destructive"}`} />
                {admin.is_active ? "Actif" : "Désactivé"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleActive}
              disabled={processing}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
            >
              {admin.is_active ? <><Archive className="h-4 w-4" /> Désactiver</> : <><ArchiveRestore className="h-4 w-4" /> Réactiver</>}
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          </div>
        </div>
        {/* Infos secondaires */}
        <div className="grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-2">
          <div className="flex items-center gap-2 bg-card px-5 py-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-card-foreground">{admin.email}</span>
          </div>
          <div className="flex items-center gap-2 bg-card px-5 py-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-card-foreground">Créé le {admin.created_at ? new Date(admin.created_at).toLocaleDateString("fr-FR") : "—"}</span>
          </div>
        </div>
      </div>

      {/* Portefeuille d'entreprises */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <Building2 className="h-5 w-5 text-[#0f4b49]" />
            Entreprises confiées
            <span className="rounded-full bg-[#0f4b49]/10 px-2 py-0.5 text-xs font-medium text-[#0f4b49]">{assigned.length}</span>
          </h2>
          {/* Attribuer une entreprise */}
          <div className="flex items-center gap-2">
            <select
              value={addSel}
              onChange={(e) => setAddSel(e.target.value)}
              disabled={available.length === 0}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm outline-none transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20 disabled:opacity-50"
            >
              <option value="">{available.length ? "Choisir une entreprise…" : "Toutes attribuées"}</option>
              {available.map((e) => (
                <option key={e.id} value={e.id}>{e.nom}{e.ville ? ` — ${e.ville}` : ""}</option>
              ))}
            </select>
            <button
              onClick={assign}
              disabled={!addSel || processing}
              className="flex items-center gap-2 rounded-lg bg-[#0f4b49] px-3 py-2 text-sm font-medium text-white hover:bg-[#0d3f3d] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Confier
            </button>
          </div>
        </div>

        {assigned.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Aucune entreprise confiée à cet admin. Utilisez le sélecteur ci-dessus pour lui en attribuer.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {assigned.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[#0f4b49]/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f4b49]/10">
                    <Building2 className="h-4 w-4 text-[#0f4b49]" />
                  </div>
                  <div>
                    <Link to="/dashboard/listes/entreprises/$id" params={{ id: e.id }} className="text-sm font-medium text-card-foreground hover:underline">
                      {e.nom}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {e.ville || "—"}{e.assigned_at ? ` · confiée le ${new Date(e.assigned_at).toLocaleDateString("fr-FR")}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => unassign(e.id)}
                  disabled={processing}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => { if (!o) setDeleteOpen(false); }}
        title={`Supprimer ${admin.full_name || admin.email} ?`}
        description="Action irréversible. Le compte admin et toutes ses attributions d'entreprises seront supprimés. Les entreprises clientes restent intactes."
        onConfirm={doDelete}
        loading={deleting}
        confirmLabel="Supprimer définitivement"
      />
    </div>
  );
}
