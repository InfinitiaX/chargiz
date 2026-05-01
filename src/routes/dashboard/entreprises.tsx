import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import CreateEntrepriseDialog from "@/components/CreateEntrepriseDialog";
import { Plus, Search, Building2, Users, Car, Archive, Eye, X } from "lucide-react";

export const Route = createFileRoute("/dashboard/entreprises")({
  component: EntreprisesPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Entreprises" },
      { name: "description", content: "Gestion des entreprises clientes ChargiZ." },
    ],
  }),
});

interface Entreprise {
  id: string;
  nom: string;
  siren: string | null;
  siret: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  email: string | null;
  telephone: string | null;
  numero_tva: string | null;
  prix_kwh_defaut: number | null;
}

function EntreprisesPage() {
  const { role } = useAuth();
  const isSuperAdmin = role === "superadmin";
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [search, setSearch] = useState("");
  const [entStats, setEntStats] = useState<Record<string, { filiales: number; collabs: number; vehicules: number }>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [viewEnt, setViewEnt] = useState<Entreprise | null>(null);

  useEffect(() => {
    loadEntreprises();
  }, []);

  async function loadEntreprises() {
    try {
      const data = await apiFetch<Entreprise[]>("/api/entreprises");
      setEntreprises(data);
      const statsMap: Record<string, { filiales: number; collabs: number; vehicules: number }> = {};
      for (const ent of data) {
        try {
          const stats = await apiFetch<any>(`/api/statistiques/entreprises/${ent.id}`);
          statsMap[ent.id] = {
            filiales: stats.nb_filiales,
            collabs: stats.nb_collaborateurs,
            vehicules: stats.nb_vehicules,
          };
        } catch (e) {
          console.error(`Error loading stats for ${ent.id}:`, e);
          statsMap[ent.id] = { filiales: 0, collabs: 0, vehicules: 0 };
        }
      }
      setEntStats(statsMap);
    } catch (err) {
      console.error("Error loading entreprises:", err);
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm("Voulez-vous archiver cette entreprise ? Cette action est irréversible.")) return;
    try {
      await apiFetch(`/api/entreprises/${id}`, { method: "DELETE" });
      loadEntreprises();
    } catch (err) {
      console.error("Error deleting entreprise:", err);
      alert("Erreur lors de la suppression de l'entreprise");
    }
  };

  const filtered = entreprises.filter(e =>
    !search || `${e.nom} ${e.siren}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Entreprises</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestion des entreprises clientes</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-chargiz-teal-light">
            <Plus className="h-4 w-4" /> Créer une entreprise
          </button>
        )}
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher une entreprise..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">Aucune entreprise trouvée</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(e => {
            const s = entStats[e.id] || { filiales: 0, collabs: 0, vehicules: 0 };
            return (
              <div key={e.id} className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-card-foreground">{e.nom}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{e.siren ? `SIREN ${e.siren}` : "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setViewEnt(e)} title="Voir" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Eye className="h-4 w-4" /></button>
                    {isSuperAdmin && (
                      <button onClick={() => handleArchive(e.id)} title="Archiver" className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Archive className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
                {e.ville && <p className="text-xs text-muted-foreground mb-4">{e.adresse}, {e.ville}</p>}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><Building2 className="h-3.5 w-3.5" /></div>
                    <p className="text-lg font-bold text-card-foreground">{s.filiales}</p>
                    <p className="text-xs text-muted-foreground">Filiales</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><Users className="h-3.5 w-3.5" /></div>
                    <p className="text-lg font-bold text-card-foreground">{s.collabs}</p>
                    <p className="text-xs text-muted-foreground">Collab.</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><Car className="h-3.5 w-3.5" /></div>
                    <p className="text-lg font-bold text-card-foreground">{s.vehicules}</p>
                    <p className="text-xs text-muted-foreground">Véhicules</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateEntrepriseDialog open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadEntreprises} />

      {/* View Dialog */}
      {viewEnt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-card-foreground">{viewEnt.nom}</h2>
              <button onClick={() => setViewEnt(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">SIREN</p><p className="mt-1 font-mono text-card-foreground">{viewEnt.siren || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">SIRET</p><p className="mt-1 font-mono text-card-foreground">{viewEnt.siret || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">N° TVA</p><p className="mt-1 text-card-foreground">{viewEnt.numero_tva || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Prix kWh</p><p className="mt-1 text-card-foreground">{viewEnt.prix_kwh_defaut ?? "0,21"} €</p></div>
              <div className="col-span-2"><p className="text-muted-foreground text-xs">Adresse</p><p className="mt-1 text-card-foreground">{[viewEnt.adresse, viewEnt.code_postal, viewEnt.ville].filter(Boolean).join(", ") || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Email</p><p className="mt-1 text-card-foreground">{viewEnt.email || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Téléphone</p><p className="mt-1 text-card-foreground">{viewEnt.telephone || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Filiales</p><p className="mt-1 font-bold text-card-foreground">{entStats[viewEnt.id]?.filiales || 0}</p></div>
              <div><p className="text-muted-foreground text-xs">Collaborateurs</p><p className="mt-1 font-bold text-card-foreground">{entStats[viewEnt.id]?.collabs || 0}</p></div>
              <div><p className="text-muted-foreground text-xs">Véhicules</p><p className="mt-1 font-bold text-card-foreground">{entStats[viewEnt.id]?.vehicules || 0}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
