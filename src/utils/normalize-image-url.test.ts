import { describe, it, expect } from "vitest";
import { isValidImageReference, normalizeImageUrls } from "./normalize-image-url";

describe("isValidImageReference", () => {
  it("URL absoluta https:// é válida", () => {
    expect(isValidImageReference("https://tiny.com.br/fotos/produto1.jpg")).toBe(true);
  });

  it("URL absoluta http:// também é válida", () => {
    expect(isValidImageReference("http://exemplo.com/a.jpg")).toBe(true);
  });

  it("caminho local iniciado por / é válido", () => {
    expect(isValidImageReference("/imagens/produto.jpg")).toBe(true);
  });

  it("'lash-1' (valor legado de placeholder) é inválido", () => {
    expect(isValidImageReference("lash-1")).toBe(false);
  });

  it("'lash-2'/'lash-3' também são inválidos", () => {
    expect(isValidImageReference("lash-2")).toBe(false);
    expect(isValidImageReference("lash-3")).toBe(false);
  });

  it("string vazia é inválida", () => {
    expect(isValidImageReference("")).toBe(false);
  });

  it("qualquer string sem / e sem protocolo é inválida", () => {
    expect(isValidImageReference("imagem-qualquer")).toBe(false);
    expect(isValidImageReference("123456")).toBe(false);
  });
});

describe("normalizeImageUrls", () => {
  it("lista mista: mantém só as válidas, na ordem original", () => {
    const result = normalizeImageUrls([
      "lash-1",
      "https://tiny.com.br/a.jpg",
      "lash-2",
      "/local/b.jpg",
      "lash-3",
      "https://tiny.com.br/c.jpg",
    ]);
    expect(result).toEqual(["https://tiny.com.br/a.jpg", "/local/b.jpg", "https://tiny.com.br/c.jpg"]);
  });

  it("lista só com valores inválidos vira array vazio", () => {
    expect(normalizeImageUrls(["lash-1", "lash-2"])).toEqual([]);
  });

  it("lista já toda válida permanece igual", () => {
    const valid = ["https://a.com/1.jpg", "https://a.com/2.jpg"];
    expect(normalizeImageUrls(valid)).toEqual(valid);
  });

  it("undefined vira array vazio, sem lançar erro", () => {
    expect(normalizeImageUrls(undefined)).toEqual([]);
  });

  it("array vazio permanece vazio", () => {
    expect(normalizeImageUrls([])).toEqual([]);
  });
});
