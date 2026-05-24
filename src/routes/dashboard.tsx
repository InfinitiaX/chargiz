import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/" });
    } else if (!loading && user?.password_change_required) {
      // BugID_001 — force le changement de mot de passe avant accès au dashboard
      navigate({ to: "/force-password-change" });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className="pt-14 md:pt-0 md:pl-64">
        <Outlet />
      </main>
    </div>
  );
}
