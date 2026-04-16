import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, Building2, Users, Car } from "lucide-react";

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
}

function EntreprisesPage() {
  const { isAtLeast } = useAuth();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [search, setSearch] = useState("");
  const [entStats, setEntStats] = useState<Record<string, { filiales: number; collabs: number; vehicules: number }>>({});

  useEffect(() => {
    loadEntreprises();
  }, []);

  async function loadEntreprises() {
    const { data } = await supabase.from("entreprises").select("id, nom, siren, siret, adresse, ville").order("nom");
    if (data) {
      setEntreprises(data);
      // Load stats for each
      const statsMap: Record<string, { filiales: number; collabs: number; vehicules: number }> = {};
      for (const ent of data) {
        const [fil, coll, veh] = await Promise.all([
          supabase.from("filiales").select("id", { count: "exact" }).eq("entreprise_id", ent.id),
          supabase.from("profiles").select("id", { count: "exact" }).eq("entreprise_id", ent.id),
          supabase.from("vehicules").select("id", { count: "exact" }).eq("entreprise_id", ent.id),
        ]);
        statsMap[ent.id] = { filiales: fil.count || 0, collabs: coll.count || 0, vehicules: veh.count || 0 };
      }
      setEntStats(statsMap);
    }
  }

  const filtered = entreprises.filter(e =>
    !search || `${e.nom} ${e.siren}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Entreprises</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestion des entreprises clientes</p>
        </div>
        {isAtLeast("admin") && (
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-chargiz-teal-light">
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
              <div key={e.id} className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-card-foreground">{e.nom}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{e.siren ? `SIREN ${e.siren}` : "—"}</p>
                    </div>
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
    </div>
  );
}
