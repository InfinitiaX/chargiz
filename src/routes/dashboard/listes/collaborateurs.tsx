import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import CreateCollaborateurDialog from "@/components/CreateCollaborateurDialog";
import { Plus, Search, Eye, Archive, Download } from "lucide-react";
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
  is_active: boolean;
  created_at: string;
}

function ListeCollaborateurs() {
  const { profile, loading } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const [collaborateurs, setCollaborateurs] = useState<Collab[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (loading || !entrepriseId) return;
    loadData();
  }, [loading, entrepriseId]);

  async function loadData() {
    // 1. Récupérer les profils de l'entreprise
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_id, nom, prenom, email, is_active, created_at")
      .eq("entreprise_id", entrepriseId)
      .order("nom");
    if (!profiles) return;

    // 2. Récupérer les rôles pour exclure les admins/gestionnaires
    const userIds = profiles.map(p => p.user_id).filter(Boolean) as string[];
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    const nonCollabUsers = new Set(
      (roles || [])
        .filter(r => r.role !== "collaborateur")
        .map(r => r.user_id)
    );

    // 3. Garder uniquement les collaborateurs (rôle "collaborateur" ou sans rôle = invités)
    const collabsOnly = profiles.filter(p => !p.user_id || !nonCollabUsers.has(p.user_id));
    setCollaborateurs(collabsOnly);
  }

  const handleArchive = async (id: string) => {
    if (!confirm("Voulez-vous archiver ce collaborateur ?")) return;
    await supabase.from("profiles").update({ is_active: false }).eq("id", id);
    loadData();
  };

  const filtered = collaborateurs.filter(c => !search || `${c.nom} ${c.prenom} ${c.email}`.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Collaborateurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Liste complète des collaborateurs</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => exportCSV("collaborateurs", filtered.map(c => ({
            Nom: c.nom, Prénom: c.prenom, Email: c.email,
            État: c.is_active ? "Actif" : "Archivé",
            "Date création": new Date(c.created_at).toLocaleDateString("fr-FR"),
          })))} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Exporter
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
            <Plus className="h-4 w-4" /> Ajouter un collaborateur
          </button>
        </div>
      </div>
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Prénom</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date de création</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">État</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Aucun collaborateur</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-card-foreground">{c.nom}</td>
                  <td className="px-6 py-4 text-card-foreground">{c.prenom}</td>
                  <td className="px-6 py-4 text-card-foreground">{new Date(c.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
                      {c.is_active ? "Actif" : "Archivé"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link to="/dashboard/collaborateur/$id" params={{ id: c.id }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Voir fiche">
                        <Eye className="h-4 w-4" />
                      </Link>
                      {c.is_active && (
                        <button onClick={() => handleArchive(c.id)} title="Archiver"
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

      {entrepriseId && (
        <CreateCollaborateurDialog entrepriseId={entrepriseId} open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />
      )}
    </div>
  );
}
