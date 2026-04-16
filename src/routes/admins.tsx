import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admins")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/listes/admins" });
  },
  component: () => null,
});