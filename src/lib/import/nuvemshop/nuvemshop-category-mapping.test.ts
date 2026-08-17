import { describe, it, expect } from "vitest";
import { isImportableRootCategory, mapCategorySlug } from "./nuvemshop-category-mapping";

describe("isImportableRootCategory", () => {
  it("true quando a raiz é Extensão de Cílios", () => {
    expect(isImportableRootCategory("Extensão de Cílios > CÍLIOS > Volume Brasileiro")).toBe(true);
  });

  it("false para NAIL DESIGNER (fora do escopo desta importação)", () => {
    expect(isImportableRootCategory("NAIL DESIGNER > Esmaltes")).toBe(false);
  });

  it("false para Sobrancelha (fora do escopo desta importação)", () => {
    expect(isImportableRootCategory("Sobrancelha > Henna")).toBe(false);
  });

  it("true se QUALQUER uma das categorias (separadas por vírgula) for Extensão de Cílios", () => {
    expect(isImportableRootCategory("NAIL DESIGNER > Esmaltes, Extensão de Cílios > CÍLIOS")).toBe(true);
  });
});

describe("mapCategorySlug", () => {
  it("mapeia CÍLIOS para cilios", () => {
    expect(mapCategorySlug("Extensão de Cílios > CÍLIOS > Volume Egípcio")).toBe("cilios");
  });

  it("mapeia Colas e Adesivos para colas", () => {
    expect(mapCategorySlug("Extensão de Cílios > Colas e Adesivos > Lashes Co")).toBe("colas");
  });

  it("mapeia Acessórios para acessorios", () => {
    expect(mapCategorySlug("Extensão de Cílios > Acessórios")).toBe("acessorios");
  });

  it("mapeia Removedores para removedores", () => {
    expect(mapCategorySlug("Extensão de Cílios > Removedores")).toBe("removedores");
  });

  it("mapeia Retenção e Limpeza para higienizacao (categoria adicionada na Sprint de Arquitetura)", () => {
    expect(mapCategorySlug("Extensão de Cílios > Retenção e Limpeza")).toBe("higienizacao");
  });

  it("devolve null para uma subcategoria genuinamente sem mapeamento", () => {
    expect(mapCategorySlug("Extensão de Cílios > Subcategoria Inexistente")).toBeNull();
  });

  it("devolve null quando a raiz não é Extensão de Cílios", () => {
    expect(mapCategorySlug("NAIL DESIGNER > Esmaltes")).toBeNull();
  });

  it("devolve null quando a categoria é só a raiz, sem subcategoria (43 produtos reais confirmados sem esse dado) — nenhuma inferência é feita", () => {
    expect(mapCategorySlug("Extensão de Cílios")).toBeNull();
  });
});
