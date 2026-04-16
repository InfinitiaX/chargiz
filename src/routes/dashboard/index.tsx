import { createFileRoute } from "@tanstack/react-router";
import KpiCard from "@/components/KpiCard";
import CollaborateurTable from "@/components/CollaborateurTable";
import { Zap, Battery, Home, MapPin, Calendar } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
  head: () => ({
    meta: [
      { title: "ChargiZ — Tableau de bord" },
      { name: "description", content: "Vue d'ensemble de vos recharges de véhicules électriques." },
    ],
  }),
});

function DashboardHome() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vue d'ensemble de l'activité de recharge</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Avril 2026</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Sessions totales"
          value="107"
          subtitle="+12% vs. mois dernier"
          icon={Zap}
          colorClass="bg-kpi-sessions/10 text-kpi-sessions"
        />
        <KpiCard
          title="Énergie totale"
          value="1 361 kWh"
          subtitle="≈ 204 € de remboursement"
          icon={Battery}
          colorClass="bg-kpi-energy/10 text-kpi-energy"
        />
        <KpiCard
          title="Recharge domicile"
          value="1 230 kWh"
          subtitle="90.4% du total"
          icon={Home}
          colorClass="bg-kpi-home/10 text-kpi-home"
        />
        <KpiCard
          title="Hors domicile"
          value="131 kWh"
          subtitle="9.6% du total"
          icon={MapPin}
          colorClass="bg-kpi-away/10 text-kpi-away"
        />
      </div>

      {/* Collaborateurs Table */}
      <CollaborateurTable />
    </div>
  );
}
