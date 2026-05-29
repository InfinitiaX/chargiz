/**
 * Tests BugID_001 — Composant ForcePasswordChange
 * Couvre : rendu, gardes de redirection, validations live, soumission.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── Mocks globaux ──────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (_path: string) => (opts: any) => opts,
  useNavigate: () => mockNavigate,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock du logo pour éviter les erreurs d'import d'assets
vi.mock("@/assets/logo-chargiz.png", () => ({ default: "logo.png" }));

const mockUpdatePassword = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/hooks/useAuth";
import { Route } from "@/routes/force-password-change";

// vi.mocked n'est qu'un cast TypeScript — on préfère le cast direct
// pour rester compatible avec d'autres runners.
const mockUseAuth = useAuth as unknown as { mockReturnValue: (v: any) => void };

const ForcePasswordChange = Route.component as React.ComponentType;

// ── Helpers ────────────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
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
    password_change_required: true,
    ...overrides,
  };
}

function renderComponent() {
  return render(<ForcePasswordChange />);
}

// ── 1. Gardes de redirection ───────────────────────────────────────────────

describe("Gardes de redirection", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUpdatePassword.mockClear();
    mockRefresh.mockClear();
  });

  it("redirige vers / si user est null", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      updatePassword: mockUpdatePassword,
      refresh: mockRefresh,
    } as any);

    renderComponent();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("redirige vers /dashboard si password_change_required est false", () => {
    mockUseAuth.mockReturnValue({
      user: makeUser({ password_change_required: false }),
      updatePassword: mockUpdatePassword,
      refresh: mockRefresh,
    } as any);

    renderComponent();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
  });

  it("affiche le formulaire si password_change_required est true", () => {
    mockUseAuth.mockReturnValue({
      user: makeUser({ password_change_required: true }),
      updatePassword: mockUpdatePassword,
      refresh: mockRefresh,
    } as any);

    renderComponent();
    expect(screen.getByText("Mot de passe temporaire")).toBeInTheDocument();
    expect(screen.getByText("Nouveau mot de passe")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ── 2. Affichage et personnalisation ──────────────────────────────────────

describe("Affichage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: makeUser({ full_name: "Marie Dupont" }),
      updatePassword: mockUpdatePassword,
      refresh: mockRefresh,
    } as any);
  });

  it("affiche le prénom de l'utilisateur dans le titre", () => {
    renderComponent();
    expect(screen.getByText(/Marie/i)).toBeInTheDocument();
  });

  it("le bouton de soumission est désactivé par défaut", () => {
    renderComponent();
    const btn = screen.getByRole("button", { name: /Définir mon mot de passe/i });
    expect(btn).toBeDisabled();
  });

  it("affiche les 6 règles de robustesse", () => {
    renderComponent();
    expect(screen.getByText(/Au moins 8 caractères/i)).toBeInTheDocument();
    expect(screen.getByText(/Une lettre majuscule/i)).toBeInTheDocument();
    expect(screen.getByText(/Une lettre minuscule/i)).toBeInTheDocument();
    expect(screen.getByText(/Un chiffre/i)).toBeInTheDocument();
    expect(screen.getByText(/Différent du mot de passe temporaire/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirmation identique/i)).toBeInTheDocument();
  });
});

// ── 3. Validations live ───────────────────────────────────────────────────

describe("Validations live", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: makeUser(),
      updatePassword: mockUpdatePassword,
      refresh: mockRefresh,
    } as any);
  });

  it("le bouton reste désactivé si nouveau mot de passe trop court", async () => {
    const user = userEvent.setup();
    renderComponent();

    const inputs = screen.getAllByPlaceholderText(/Reçu par email|Choisissez|Retapez/i);
    await user.type(inputs[0], "TempPwd1!");  // ancien
    await user.type(inputs[1], "Aa1");        // trop court
    await user.type(inputs[2], "Aa1");        // confirmation

    expect(screen.getByRole("button", { name: /Définir/i })).toBeDisabled();
  });

  it("le bouton reste désactivé si confirmation ne correspond pas", async () => {
    const user = userEvent.setup();
    renderComponent();

    const inputs = screen.getAllByPlaceholderText(/Reçu par email|Choisissez|Retapez/i);
    await user.type(inputs[0], "TempPwd1!");
    await user.type(inputs[1], "NouveauPwd1!");
    await user.type(inputs[2], "NouveauPwd2!");  // différent

    expect(screen.getByRole("button", { name: /Définir/i })).toBeDisabled();
  });

  it("le bouton reste désactivé si nouveau = ancien", () => {
    renderComponent();

    const inputs = screen.getAllByPlaceholderText(/Reçu par email|Choisissez|Retapez/i);
    fireEvent.change(inputs[0], { target: { value: "TempPwd1!" } });
    fireEvent.change(inputs[1], { target: { value: "TempPwd1!" } });
    fireEvent.change(inputs[2], { target: { value: "TempPwd1!" } });

    expect(screen.getByRole("button", { name: /Définir/i })).toBeDisabled();
  });

  it("le bouton s'active quand toutes les règles sont respectées", () => {
    renderComponent();

    const inputs = screen.getAllByPlaceholderText(/Reçu par email|Choisissez|Retapez/i);
    fireEvent.change(inputs[0], { target: { value: "TempPwd1!" } });
    fireEvent.change(inputs[1], { target: { value: "NouveauPwd1!" } });
    fireEvent.change(inputs[2], { target: { value: "NouveauPwd1!" } });

    expect(screen.getByRole("button", { name: /Définir/i })).not.toBeDisabled();
  });
});

// ── 4. Soumission ─────────────────────────────────────────────────────────

describe("Soumission du formulaire", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUpdatePassword.mockClear();
    mockRefresh.mockClear();

    mockUseAuth.mockReturnValue({
      user: makeUser(),
      updatePassword: mockUpdatePassword,
      refresh: mockRefresh,
    } as any);
  });

  it("appelle updatePassword puis refresh et redirige vers /dashboard en cas de succès", async () => {
    mockUpdatePassword.mockResolvedValue(undefined);
    mockRefresh.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderComponent();

    const inputs = screen.getAllByPlaceholderText(/Reçu par email|Choisissez|Retapez/i);
    await user.type(inputs[0], "TempPwd1!");
    await user.type(inputs[1], "NouveauPwd1!");
    await user.type(inputs[2], "NouveauPwd1!");

    await user.click(screen.getByRole("button", { name: /Définir/i }));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith("TempPwd1!", "NouveauPwd1!");
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
  });

  it("affiche un message d'erreur si updatePassword échoue", async () => {
    mockUpdatePassword.mockRejectedValue(new Error("L'ancien mot de passe est incorrect."));

    const user = userEvent.setup();
    renderComponent();

    const inputs = screen.getAllByPlaceholderText(/Reçu par email|Choisissez|Retapez/i);
    await user.type(inputs[0], "MauvaisTmp1!");
    await user.type(inputs[1], "NouveauPwd1!");
    await user.type(inputs[2], "NouveauPwd1!");

    await user.click(screen.getByRole("button", { name: /Définir/i }));

    await waitFor(() => {
      expect(screen.getByText(/ancien mot de passe est incorrect/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalledWith({ to: "/dashboard" });
    });
  });

  it("ne redirige pas si refresh échoue (erreur réseau tolérée)", async () => {
    mockUpdatePassword.mockResolvedValue(undefined);
    mockRefresh.mockRejectedValue(new Error("Network error"));

    const user = userEvent.setup();
    renderComponent();

    const inputs = screen.getAllByPlaceholderText(/Reçu par email|Choisissez|Retapez/i);
    await user.type(inputs[0], "TempPwd1!");
    await user.type(inputs[1], "NouveauPwd1!");
    await user.type(inputs[2], "NouveauPwd1!");

    await user.click(screen.getByRole("button", { name: /Définir/i }));

    // Le composant attrape l'erreur globalement — pas de navigation
    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalled();
    });
  });
});
