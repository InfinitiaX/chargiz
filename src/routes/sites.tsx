import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/sites")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/listes/sites" });
  },
  component: () => null,
});