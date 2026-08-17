import { describe, it, expect } from "vitest";
import { sanitizeHtmlForDisplay, containsHtml } from "./sanitize-html-for-display";

describe("sanitizeHtmlForDisplay", () => {
  it("preserva tags de formatação permitidas", () => {
    expect(sanitizeHtmlForDisplay("<p>Parágrafo <strong>importante</strong></p>")).toBe(
      "<p>Parágrafo <strong>importante</strong></p>"
    );
  });

  it("remove <script> e todo o conteúdo dentro dele", () => {
    const result = sanitizeHtmlForDisplay('<p>Texto</p><script>alert("hack")</script>');
    expect(result).not.toContain("script");
    expect(result).not.toContain("alert");
    expect(result).toContain("Texto");
  });

  it("remove <style>/<iframe> e o conteúdo, mesmo com atributos", () => {
    const result = sanitizeHtmlForDisplay('<iframe src="https://malicioso.com"></iframe><p>Ok</p>');
    expect(result).not.toContain("iframe");
    expect(result).not.toContain("malicioso");
    expect(result).toContain("Ok");
  });

  it("remove TODOS os atributos de tags permitidas (sem onclick, sem style, sem href)", () => {
    const result = sanitizeHtmlForDisplay('<p onclick="hack()" style="color:red">Texto</p>');
    expect(result).toBe("<p>Texto</p>");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("style");
  });

  it("remove tags não permitidas mas preserva o texto de dentro (unwrap)", () => {
    const result = sanitizeHtmlForDisplay('<div class="qualquer">Texto dentro de div</div>');
    expect(result).toBe("Texto dentro de div");
  });

  it("remove um <a href='javascript:...'> mas preserva o texto do link", () => {
    const result = sanitizeHtmlForDisplay('<a href="javascript:alert(1)">clique aqui</a>');
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("href");
    expect(result).toContain("clique aqui");
  });

  it("decodifica entidades HTML", () => {
    expect(sanitizeHtmlForDisplay("Cora&ccedil;&atilde;o")).toBe("Coração");
  });

  it("preserva listas", () => {
    expect(sanitizeHtmlForDisplay("<ul><li>Item 1</li><li>Item 2</li></ul>")).toBe(
      "<ul><li>Item 1</li><li>Item 2</li></ul>"
    );
  });

  it("string vazia continua vazia", () => {
    expect(sanitizeHtmlForDisplay("")).toBe("");
  });

  it("texto puro sem HTML nenhum permanece igual", () => {
    expect(sanitizeHtmlForDisplay("Texto simples sem tags")).toBe("Texto simples sem tags");
  });
});

describe("containsHtml", () => {
  it("true quando há tags", () => {
    expect(containsHtml("<p>Texto</p>")).toBe(true);
  });

  it("false para texto puro", () => {
    expect(containsHtml("Texto simples")).toBe(false);
  });

  it("false para texto com sinais de menor/maior que não são tags", () => {
    expect(containsHtml("2 < 3 e 5 > 4")).toBe(false);
  });
});
