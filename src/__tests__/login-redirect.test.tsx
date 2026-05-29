/**
 * Tests BugID_001 — Logique de redirection à la connexion (index.tsx)
 * Couvre : redirection vers /force-password-change ou /dashboard selon le flag.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── Mocks globaux ──────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (_path: string) => (opts: any) => opts,
  useNavigate: () => mockNavigate,
}));

vi.mock("@/assets/logo-chargiz.png", () => ({ default: "logo.png" }));
vi.mock("@/assets/login-hero.jpg", () => ({ default: "hero.jpg" }));

const mockSignIn = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/hooks/useAuth";
import { Route } from "@/routes/index";

const LoginPage = Route.component as React.ComponentType;
const mockUseAuth = useAuth as unknown as { mockReturnValue: (v: any) => void };

// ── Helpers ────────────────────────────────────────────────────────────────

function makeUser(passwordChangeRequired: boolean) {
  return {
    id: "1",
    email: "user@test.com",
    username: "user1",
    full_name: "Jean Test",
    role: "gestionnaire_entreprise" as const,
    entreprise_id: null,
    filiale_id: null,
    site_id: null,
    is_active: true,
    password_change_required: passwordChangeRequired,
  };
}

function renderLogin() {
  mockUseAuth.mockReturnValue({ signIn: mockSignIn });
  return render(<LoginPage />);
}

// ── 1. Redirection après login ─────────────────────────────────────────────

describe("Redirection après connexion", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSignIn.mockClear();
  });

  it("redirige vers /force-password-change si password_change_required=true", async () => {
    mockSignIn.mockResolvedValue({
      user: makeUser(true),
      session: { access_token: "tok", token_type: "bearer" },
    });

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText(/superadmin ou nom/i), "user@test.com");
    await user.type(screen.getByPlaceholderText(/••••••••/i), "TempPwd1!");
    await user.click(screen.getByRole("button", { name: /Se connecter/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("user@test.com", "TempPwd1!");
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/force-password-change" });
    });
  });

  it("redirige vers /dashboard si password_change_required=false", async () => {
    mockSignIn.mockResolvedValue({
      user: makeUser(false),
      session: { access_token: "tok", token_type: "bearer" },
    });

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText(/superadmin ou nom/i), "user@test.com");
    await user.type(screen.getByPlaceholderText(/••••••••/i), "MonPwd123!");
    await user.click(screen.getByRole("button", { name: /Se connecter/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
      expect(mockNavigate).not.toHaveBeenCalledWith({ to: "/force-password-change" });
    });
  });

  it("redirige vers /dashboard si password_change_required est absent (undefined)", async () => {
    mockSignIn.mockResolvedValue({
      user: { ...makeUser(false), password_change_required: undefined },
      session: { access_token: "tok", token_type: "bearer" },
    });

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText(/superadmin ou nom/i), "user@test.com");
    await user.type(screen.getByPlaceholderText(/••••••••/i), "MonPwd123!");
    await user.click(screen.getByRole("button", { name: /Se connecter/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
  });
});

// ── 2. Gestion des erreurs de connexion ───────────────────────────────────

describe("Gestion des erreurs de connexion", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSignIn.mockClear();
  });

  it("affiche un message d'erreur si les identifiants sont incorrects", async () => {
    mockSignIn.mockRejectedValue(new Error("Email ou mot de passe incorrect."));

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText(/superadmin ou nom/i), "user@test.com");
    await user.type(screen.getByPlaceholderText(/••••••••/i), "MauvaisPwd1!");
    await user.click(screen.getByRole("button", { name: /Se connecter/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email ou mot de passe incorrect/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("affiche un message adapté si le compte est désactivé", async () => {
    mockSignIn.mockRejectedValue(new Error("Votre compte est désactivé."));

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText(/superadmin ou nom/i), "user@test.com");
    await user.type(screen.getByPlaceholderText(/••••••••/i), "Pwd123!");
    await user.click(screen.getByRole("button", { name: /Se connecter/i }));

    await waitFor(() => {
      expect(screen.getByText(/compte est désactivé/i)).toBeInTheDocument();
    });
  });

  it("ne navigue pas en cas d'erreur réseau", async () => {
    mockSignIn.mockRejectedValue(new Error("Erreur réseau"));

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText(/superadmin ou nom/i), "user@test.com");
    await user.type(screen.getByPlaceholderText(/••••••••/i), "Pwd123!");
    await user.click(screen.getByRole("button", { name: /Se connecter/i }));

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});

// ── 3. Formulaire — comportement de base ──────────────────────────────────

describe("Formulaire de connexion", () => {
  beforeEach(() => {
    mockSignIn.mockClear();
  });

  it("affiche les champs email et mot de passe", () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/superadmin ou nom/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
  });

  it("le bouton de connexion est présent et activé", () => {
    renderLogin();
    const btn = screen.getByRole("button", { name: /Se connecter/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it("affiche le mode 'Mot de passe oublié' au clic", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByText(/Mot de passe oublié \?/i));
    expect(screen.getByText(/Entrez votre email pour recevoir un lien/i)).toBeInTheDocument();
  });
});
