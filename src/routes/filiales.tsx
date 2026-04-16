import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/filiales")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/listes/filiales" });
  },
  component: () => null,
});