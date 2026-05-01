import { createFileRoute, redirect } from "@tanstack/react-router";

// Front-only demo: bypass login and land directly on the dashboard.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
  head: () => ({
    meta: [
      { title: "ChargiZ — Démo" },
      { name: "description", content: "Maquette ChargiZ : suivi et gestion des recharges de véhicules électriques." },
    ],
  }),
});
