import { Link, useLocation } from "@tanstack/react-router";
import logoWhite from "@/assets/logo-white.jpg";
import {
  LayoutDashboard,
  List,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Car,
  Building2,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Accueil" },
  { to: "/dashboard/collaborateurs", icon: Users, label: "Collaborateurs" },
  { to: "/dashboard/vehicules", icon: Car, label: "Véhicules" },
  { to: "/dashboard/entreprises", icon: Building2, label: "Entreprises" },
  { to: "/dashboard/statistiques", icon: BarChart3, label: "Statistiques" },
  { to: "/dashboard/reglages", icon: Settings, label: "Réglages" },
];

export default function DashboardSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-20 items-center justify-center border-b border-sidebar-border px-6">
        <img src={logoWhite} alt="ChargiZ" className="h-10 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navItems.map((item) => {
          const isActive =
            item.to === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-4">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <LogOut className="h-5 w-5" />
          Déconnexion
        </Link>
      </div>
    </aside>
  );
}
