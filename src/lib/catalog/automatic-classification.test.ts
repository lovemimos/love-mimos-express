import { describe, expect, it } from "vitest";
import { classifyCatalogProduct } from "./automatic-classification";

const classify = (name: string, categorySlug = "cilios") => classifyCatalogProduct({ name, categorySlug });

describe("classificação determinística do catálogo", () => {
  it.each([
    ["Cola Cherry Lash One 3ml", "colas-e-adesivos"],
    ["Bico para cola 10 unidades", "acessorios-para-cola"],
    ["Removedor em gel", "removedores"],
    ["Pinça curva Nagaraku", "pincas"],
    ["Mini kit retenção Cherry", "kits"],
  ])("classifica %s com segurança", (name, expected) => {
    expect(classify(name).categorySlug).toBe(expected);
  });

  it("não usa palavra ambígua isolada para trocar categoria", () => {
    expect(classify("Pure Professional", "higienizacao").categorySlug).toBe("higienizacao");
  });

  it("infere marca sem apagar categoria original", () => {
    const result = classify("Acelerador de secagem Cherry Lash");
    expect(result.brandSlug).toBe("cherry");
    expect(result.source).toBe("automatic");
  });
});
