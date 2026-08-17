import { describe, it, expect } from "vitest";
import { scanForImageCandidates, extractUsableImageUrls } from "./tiny-v2-image-scanner";

describe("scanForImageCandidates", () => {
  it("encontra URL de imagem no caminho assumido (anexos[].anexo.url)", () => {
    const raw = { anexos: [{ anexo: { url: "https://tiny.com.br/fotos/produto1.jpg" } }] };
    const result = scanForImageCandidates(raw);
    expect(result.some((c) => c.value === "https://tiny.com.br/fotos/produto1.jpg" && c.looksLikeUrl)).toBe(true);
  });

  it("encontra imagem mesmo em uma estrutura totalmente diferente da assumida", () => {
    const raw = { midias: [{ arquivo: { link_publico: "https://cdn.tiny.com.br/img/abc.png" } }] };
    const result = scanForImageCandidates(raw);
    expect(result.some((c) => c.value === "https://cdn.tiny.com.br/img/abc.png")).toBe(true);
  });

  it("encontra por extensão de imagem mesmo com nome de chave genérico", () => {
    const raw = { dados: { referencia: "https://exemplo.com/qualquercoisa.webp" } };
    const result = scanForImageCandidates(raw);
    expect(result.some((c) => c.value === "https://exemplo.com/qualquercoisa.webp")).toBe(true);
  });

  it("detecta o caso 'só IDs, sem URL' (tarefa 3)", () => {
    const raw = { anexos: [{ anexo_id: 12345 }] };
    const result = scanForImageCandidates(raw);
    const idCandidate = result.find((c) => c.key === "anexo_id");
    expect(idCandidate).toBeDefined();
    expect(idCandidate?.looksLikeUrl).toBe(false);
  });

  it("não encontra nada quando o payload realmente não tem nenhum campo de imagem", () => {
    const raw = { nome: "Produto", preco: 50, estoque: 10 };
    const result = scanForImageCandidates(raw);
    expect(result).toEqual([]);
  });

  it("varre arrays aninhados e objetos profundos sem quebrar", () => {
    const raw = { produto: { variacoes: [{ variacao: { anexos: [{ url: "https://x.com/v1.jpg" }] } }] } };
    const result = scanForImageCandidates(raw);
    expect(result.some((c) => c.value === "https://x.com/v1.jpg")).toBe(true);
  });

  it("não trava com valores null/undefined/booleanos no meio do payload", () => {
    const raw = { anexos: null, extra: undefined, ativo: true, contagem: 0 };
    expect(() => scanForImageCandidates(raw)).not.toThrow();
  });
});

describe("extractUsableImageUrls", () => {
  it("devolve só as URLs utilizáveis, sem duplicatas", () => {
    const raw = {
      anexos: [{ anexo: { url: "https://tiny.com.br/a.jpg" } }, { anexo: { url: "https://tiny.com.br/a.jpg" } }],
    };
    expect(extractUsableImageUrls(raw)).toEqual(["https://tiny.com.br/a.jpg"]);
  });

  it("a primeira URL encontrada fica em primeiro no array (vira a imagem principal)", () => {
    const raw = {
      anexos: [
        { anexo: { url: "https://tiny.com.br/principal.jpg" } },
        { anexo: { url: "https://tiny.com.br/segunda.jpg" } },
      ],
    };
    const urls = extractUsableImageUrls(raw);
    expect(urls[0]).toBe("https://tiny.com.br/principal.jpg");
  });

  it("array vazio quando não há nenhuma URL utilizável, mesmo com IDs presentes", () => {
    const raw = { anexos: [{ anexo_id: 999 }] };
    expect(extractUsableImageUrls(raw)).toEqual([]);
  });
});
