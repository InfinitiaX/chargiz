import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/collaborateurs")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/listes/collaborateurs" });
  },
  component: () => null,
});