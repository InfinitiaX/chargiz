import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, Eye, Archive } from "lucide-react";

export const Route = createFileRoute("/dashboard/listes/admins")({
  component: ListeAdmins,
  head: () => ({ meta: [{ title: "ChargiZ — Admins" }] }),
});

interface AdminUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  is_active: boolean;
  created_at: string;
  role: string;
}

function ListeAdmins() {
  const { role, loading } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (loading || role !== "superadmin") return;
    loadData();
  }, [loading, role]);

  async function loadData() {
    // Get admin & superadmin roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "superadmin"]);

    if (!roles || roles.length === 0) {
      setAdmins([]);
      return;
    }

    const userIds = roles.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nom, prenom, email, is_active, created_at, user_id")
      .in("user_id", userIds)
      .order("nom");

    if (profiles) {
      const merged = profiles.map(p => ({
        ...p,
        role: roles.find(r => r.user_id === p.user_id)?.role || "admin",
      }));
      setAdmins(merged);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (role !== "superadmin") {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Accès réservé au SuperAdmin.</p>
      </div>
    );
  }

  const filtered = admins.filter(a =>
    !search || `${a.nom} ${a.prenom} ${a.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admins</h1>
          <p className="mt-1 text-sm text-muted-foreground">Liste des administrateurs de la plateforme</p>
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
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Rôle</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">État</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Aucun admin trouvé</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-card-foreground">{a.nom}</td>
                  <td className="px-6 py-4 text-card-foreground">{a.prenom}</td>
                  <td className="px-6 py-4 text-card-foreground">{a.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary capitalize">
                      {a.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${a.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
                      {a.is_active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
