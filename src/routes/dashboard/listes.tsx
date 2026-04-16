import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/listes")({
  component: ListesLayout,
});

function ListesLayout() {
  return <Outlet />;
}
