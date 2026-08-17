// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import ProductImage from "./ProductImage";

describe("ProductImage — produto com imagens externas reais (bug corrigido)", () => {
  afterEach(cleanup);

  it("renderiza a foto real (não o placeholder) quando images tem ao menos uma URL", () => {
    render(
      <ProductImage
        images={["https://tiny.com.br/fotos/produto1.jpg"]}
        categorySlug="cilios"
        alt="Cílios Volume Russo"
      />
    );
    const img = screen.getByAltText("Cílios Volume Russo");
    expect(img.tagName).toBe("IMG");
    // next/image reescreve o src via loader — o importante é que a URL
    // original apareça em algum atributo (src ou srcset), confirmando
    // que a imagem real está sendo passada adiante, não descartada.
    const src = img.getAttribute("src") ?? "";
    const srcset = img.getAttribute("srcset") ?? "";
    expect(src.includes("tiny.com.br") || srcset.includes("tiny.com.br")).toBe(true);
  });

  it("renderiza o placeholder (sem <img>) quando images está vazio", () => {
    render(<ProductImage images={[]} categorySlug="cilios" alt="Produto sem foto" />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("usa a primeira imagem como principal por padrão (index=0)", () => {
    render(
      <ProductImage
        images={["https://x.com/principal.jpg", "https://x.com/segunda.jpg"]}
        categorySlug="cilios"
        alt="Produto"
      />
    );
    const img = screen.getByAltText("Produto");
    const src = img.getAttribute("src") ?? "";
    const srcset = img.getAttribute("srcset") ?? "";
    expect(src.includes("principal") || srcset.includes("principal")).toBe(true);
  });

  it("respeita o índice pedido para mostrar uma imagem diferente da primeira", () => {
    render(
      <ProductImage
        images={["https://x.com/principal.jpg", "https://x.com/segunda.jpg"]}
        index={1}
        categorySlug="cilios"
        alt="Produto"
      />
    );
    const img = screen.getByAltText("Produto");
    const src = img.getAttribute("src") ?? "";
    const srcset = img.getAttribute("srcset") ?? "";
    expect(src.includes("segunda") || srcset.includes("segunda")).toBe(true);
  });
});

describe("ProductImage — valores legados inválidos (ex.: 'lash-1') nunca quebram nem viram <img>", () => {
  afterEach(cleanup);

  it("caminho local '/imagem.jpg' é aceito como imagem real", () => {
    render(<ProductImage images={["/imagens/produto.jpg"]} categorySlug="cilios" alt="Produto local" />);
    const img = screen.getByAltText("Produto local");
    const src = img.getAttribute("src") ?? "";
    const srcset = img.getAttribute("srcset") ?? "";
    expect(src.includes("imagens%2Fproduto.jpg") || srcset.includes("imagens%2Fproduto.jpg") || src.includes("imagens/produto.jpg")).toBe(true);
  });

  it("valor legado 'lash-1' é ignorado — renderiza o placeholder, nunca tenta virar <img src=\"lash-1\">", () => {
    render(<ProductImage images={["lash-1"]} categorySlug="cilios" alt="Produto com valor legado" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByAltText("Produto com valor legado")).toBeNull();
  });

  it("lista mista (válidas + inválidas): usa só as válidas, na ordem, ignorando o lixo legado", () => {
    render(
      <ProductImage
        images={["lash-1", "https://tiny.com.br/real.jpg", "lash-2"]}
        categorySlug="cilios"
        alt="Produto misto"
      />
    );
    const img = screen.getByAltText("Produto misto");
    const src = img.getAttribute("src") ?? "";
    const srcset = img.getAttribute("srcset") ?? "";
    expect(src.includes("real.jpg") || srcset.includes("real.jpg")).toBe(true);
  });
});
