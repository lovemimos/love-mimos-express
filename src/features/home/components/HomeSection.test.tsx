// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import HomeSection from "./HomeSection";

afterEach(() => cleanup());

describe("HomeSection", () => {
  it("renderiza o título e os filhos no caso normal", () => {
    render(
      <HomeSection title="Mais Vendidos">
        <div>conteúdo da seção</div>
      </HomeSection>
    );
    expect(screen.getByText("Mais Vendidos")).toBeTruthy();
    expect(screen.getByText("conteúdo da seção")).toBeTruthy();
  });

  it("não renderiza nada quando isError é true", () => {
    const { container } = render(
      <HomeSection title="Mais Vendidos" isError>
        <div>não deveria aparecer</div>
      </HomeSection>
    );
    expect(container.innerHTML).toBe("");
  });

  it("não renderiza nada quando isEmpty é true e não está carregando (regra 'sem renderização')", () => {
    const { container } = render(
      <HomeSection title="Continue Comprando" isEmpty>
        <div>não deveria aparecer</div>
      </HomeSection>
    );
    expect(container.innerHTML).toBe("");
  });

  it("mostra o skeleton de carregamento quando isLoading é true, mesmo com isEmpty true", () => {
    render(
      <HomeSection title="Mais Vendidos" isLoading isEmpty>
        <div>conteúdo real ainda não chegou</div>
      </HomeSection>
    );
    // O título aparece (a seção está "aberta", só carregando)...
    expect(screen.getByText("Mais Vendidos")).toBeTruthy();
    // ...mas o conteúdo real (children) não é mostrado durante o loading.
    expect(screen.queryByText("conteúdo real ainda não chegou")).toBeNull();
  });

  it("renderiza o CTA quando ctaHref é passado", () => {
    render(
      <HomeSection title="Seus Favoritos" ctaHref="/favoritos" ctaLabel="Ver tudo">
        <div>produtos</div>
      </HomeSection>
    );
    const link = screen.getByText("Ver tudo") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/favoritos");
  });

  it("não renderiza CTA quando ctaHref não é passado", () => {
    render(
      <HomeSection title="Categorias em Destaque">
        <div>produtos</div>
      </HomeSection>
    );
    expect(screen.queryByText("Ver tudo")).toBeNull();
  });
});
