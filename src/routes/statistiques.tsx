import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/statistiques")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/statistiques" });
  },
  component: () => null,
});