import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mes-infos")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/mes-infos" });
  },
  component: () => null,
});