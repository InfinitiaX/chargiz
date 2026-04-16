import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/vehicules")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/listes/vehicules" });
  },
  component: () => null,
});