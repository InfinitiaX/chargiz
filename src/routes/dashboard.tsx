import { createFileRoute, Outlet } from "@tanstack/react-router";
import DashboardSidebar from "@/components/DashboardSidebar";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className="pl-64">
        <Outlet />
      </main>
    </div>
  );
}
