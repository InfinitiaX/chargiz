import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/entreprises")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/listes/entreprises" });
  },
  component: () => null,
});