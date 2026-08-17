import { describe, it, expect } from "vitest";
import { stripHtmlToPlainText } from "./sanitize-html";

describe("stripHtmlToPlainText", () => {
  it("remove tags HTML", () => {
    expect(stripHtmlToPlainText("<p>Texto do produto</p>")).toBe("Texto do produto");
  });

  it("decodifica entidades nomeadas acentuadas (padrão real do export)", () => {
    expect(stripHtmlToPlainText("Limpeza org&acirc;nica")).toBe("Limpeza orgânica");
  });

  it("decodifica entidades numéricas", () => {
    expect(stripHtmlToPlainText("caf&#233;")).toBe("café");
  });

  it("decodifica travessão e outras entidades de pontuação (confirmadas nos dados reais)", () => {
    expect(stripHtmlToPlainText("Secagem &mdash; controlada")).toBe("Secagem — controlada");
  });

  it("remove markup legado embutido (ex.: <form> de uma plataforma antiga)", () => {
    const html = '<div>Texto real</div> <form action="https://exemplo.com/old"></form>';
    const result = stripHtmlToPlainText(html);
    expect(result).toBe("Texto real");
    expect(result).not.toContain("form");
  });

  it("colapsa espaços múltiplos resultantes da remoção de tags", () => {
    expect(stripHtmlToPlainText("<p>A</p>\n<p>B</p>")).toBe("A B");
  });

  it("string vazia continua vazia", () => {
    expect(stripHtmlToPlainText("")).toBe("");
  });
});
