import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/reglages")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/reglages" });
  },
  component: () => null,
});