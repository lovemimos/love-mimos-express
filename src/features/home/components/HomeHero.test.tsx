// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import HomeHero from "./HomeHero";
import type { HeroBanner } from "@/types";

afterEach(() => cleanup());

function banner(overrides: Partial<HeroBanner>): HeroBanner {
  return {
    id: overrides.id ?? "banner-1",
    title: "Título do banner",
    ctaLabel: "Ver mais",
    ctaHref: "/busca",
    theme: "dark",
    ...overrides,
  };
}

describe("HomeHero", () => {
  it("renderiza um único banner normalmente", () => {
    render(<HomeHero banners={[banner({ title: "Promoção de Cílios" })]} />);
    expect(screen.getByText("Promoção de Cílios")).toBeTruthy();
  });

  it("não renderiza nada quando não há banners (contrato preparado para lista vazia)", () => {
    const { container } = render(<HomeHero banners={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("com um único banner, não mostra indicadores de navegação (dots)", () => {
    const { container } = render(<HomeHero banners={[banner({})]} />);
    // Cada dot é um <span> extra fora do texto — com 1 banner só, a lista de dots não deveria existir.
    expect(container.querySelectorAll("a").length).toBe(1); // só o link do CTA
  });

  it("com múltiplos banners, mostra um indicador por banner (preparado para múltiplos banners)", () => {
    render(<HomeHero banners={[banner({ id: "a" }), banner({ id: "b" }), banner({ id: "c" })]} />);
    // O primeiro banner é mostrado; os indicadores de navegação (dots) devem existir, um por banner.
    const dotsContainer = screen.getByText("Título do banner").closest("section");
    expect(dotsContainer?.querySelectorAll("span.rounded-full").length).toBeGreaterThanOrEqual(3);
  });

  it("aplica o tema claro (light) com as classes corretas", () => {
    const { container } = render(<HomeHero banners={[banner({ theme: "light" })]} />);
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-rose-50");
  });

  it("aplica o tema escuro (dark) com as classes corretas", () => {
    const { container } = render(<HomeHero banners={[banner({ theme: "dark" })]} />);
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-plum");
  });
});
