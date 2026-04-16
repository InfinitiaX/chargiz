import { createFileRoute } from "@tanstack/react-router";
import KpiCard from "@/components/KpiCard";
import { Zap, Battery, Home, MapPin, TrendingUp, Users, Euro } from "lucide-react";

export const Route = createFileRoute("/dashboard/statistiques")({
  component: StatistiquesPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Statistiques" },
      { name: "description", content: "Statistiques détaillées de recharge." },
    ],
  }),
});

function StatistiquesPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Statistiques</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vue globale de l'activité de recharge de l'entreprise</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Sessions totales" value="107" subtitle="Ce mois" icon={Zap} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Énergie consommée" value="1 361 kWh" subtitle="Ce mois" icon={Battery} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="Coût moyen / session" value="1,90 €" subtitle="Prix kWh: 0,15 €" icon={Euro} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Collaborateurs actifs" value="42" subtitle="sur 45 inscrits" icon={Users} colorClass="bg-kpi-away/10 text-kpi-away" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart placeholder */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">Énergie consommée par mois</h3>
          <div className="flex h-64 items-center justify-center rounded-lg bg-muted/50">
            <div className="text-center">
              <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">Graphique disponible prochainement</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">Répartition domicile / hors domicile</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Domicile</span>
                <span className="text-sm font-semibold text-card-foreground">90.4%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted">
                <div className="h-3 rounded-full bg-chargiz-teal" style={{ width: "90.4%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Hors domicile</span>
                <span className="text-sm font-semibold text-card-foreground">9.6%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted">
                <div className="h-3 rounded-full bg-chargiz-lime" style={{ width: "9.6%" }} />
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold text-chargiz-teal">1 230</p>
              <p className="text-xs text-muted-foreground">kWh domicile</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold text-chargiz-lime-dark">131</p>
              <p className="text-xs text-muted-foreground">kWh hors domicile</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
