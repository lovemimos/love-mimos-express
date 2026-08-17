import { describe, it, expect } from "vitest";
import { normalizeSearchText, searchTerms } from "./normalize-text";

describe("normalizeSearchText", () => {
  it("remove acentos", () => {
    expect(normalizeSearchText("Cílios")).toBe("cilios");
  });

  it("ignora maiúsculas/minúsculas", () => {
    expect(normalizeSearchText("CÍLIOS")).toBe("cilios");
  });

  it("remove espaços extras (início, fim, múltiplos internos)", () => {
    expect(normalizeSearchText("  cilios    marrom  ")).toBe("cilios marrom");
  });

  it("combina acento, caixa e espaço extra ao mesmo tempo", () => {
    expect(normalizeSearchText("  CÍLIOS   Marrom ")).toBe("cilios marrom");
  });
});

describe("searchTerms", () => {
  it("divide um termo em palavras normalizadas", () => {
    expect(searchTerms("Cílios Marrom")).toEqual(["cilios", "marrom"]);
  });

  it("retorna array vazio para string vazia ou só espaços", () => {
    expect(searchTerms("")).toEqual([]);
    expect(searchTerms("   ")).toEqual([]);
  });
});
