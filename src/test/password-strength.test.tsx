import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PasswordStrength } from "@/componentes/ui/password-strength";

describe("PasswordStrength", () => {
  it("não renderiza nada sem senha", () => {
    const { container } = render(<PasswordStrength senha="" />);
    expect(container.firstChild).toBeNull();
  });

  it("mostra checklist com senha fraca", () => {
    render(<PasswordStrength senha="abc" />);
    expect(screen.getByText(/8\+ caracteres/)).toBeInTheDocument();
    expect(screen.getByText(/Letra maiúscula/)).toBeInTheDocument();
  });

  it("marca regras como atendidas com senha forte", () => {
    render(<PasswordStrength senha="Abc12345!" />);
    // Todas as regras devem estar com ✓
    const items = screen.getAllByText(/✓/);
    expect(items.length).toBe(5);
  });

  it("marca parcialmente com senha média", () => {
    render(<PasswordStrength senha="abcdefgh" />);
    // Apenas "8+ caracteres" e "Letra minúscula" devem ter ✓
    const checkmarks = screen.getAllByText(/✓/);
    expect(checkmarks.length).toBe(2);
  });
});
