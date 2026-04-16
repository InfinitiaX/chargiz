import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mes-consommations")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/mes-consommations" });
  },
  component: () => null,
});