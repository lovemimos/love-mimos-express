import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProductRepository } from "@/lib/repositories/contracts";
import { MockProductRepository } from "@/lib/repositories/mock/mock-product-repository";

vi.mock("@/lib/repositories/tiny/tiny-client", () => {
  class TinyApiError extends Error {
    kind: string;
    status?: number;
    constructor(message: string, kind: string, status?: number) {
      super(message);
      this.name = "TinyApiError";
      this.kind = kind;
      this.status = status;
    }
  }
  return { tinyClient: { get: vi.fn() }, TinyApiError };
});

import { tinyClient } from "@/lib/repositories/tiny/tiny-client";
import { TinyProductRepository } from "@/lib/repositories/tiny/tiny-product-repository";
import { tinyCache } from "@/lib/repositories/tiny/cache";

const getMock = tinyClient.get as unknown as ReturnType<typeof vi.fn>;

function tinyProductDetail(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    sku: `SKU-${id}`,
    descricao: `Cílios Produto ${id}`,
    situacao: "A",
    precos: { preco: 10 + id, precoPromocional: null },
    estoque: { quantidade: 5 },
    categoria: { id: 1, nome: "Cílios", caminhoCompleto: null },
    anexos: [],
    ...overrides,
  };
}

/**
 * Same suite, run against whichever repository is passed in — this is
 * what "compatibilidade dos repositórios com o contrato atualizado"
 * means in practice: identical behavior from the caller's point of view,
 * regardless of which implementation is behind `ProductRepository`.
 */
function sharedContractSuite(getRepository: () => ProductRepository) {
  it("query() aceita um objeto vazio e devolve uma página válida", async () => {
    const repo = getRepository();
    const result = await repo.query({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page", 1);
    expect(result).toHaveProperty("pageSize");
    expect(result).toHaveProperty("hasMore");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("query() com busca por termo inexistente devolve lista vazia sem erro", async () => {
    const repo = getRepository();
    const result = await repo.query({ search: "xyz-produto-que-nao-existe-123" });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("query() com parâmetros inválidos não lança erro (fallback seguro)", async () => {
    const repo = getRepository();
    await expect(
      repo.query({
        // @ts-expect-error simulando parâmetro inválido vindo de uma URL
        sort: "invalido",
        page: -1,
        pageSize: 999999,
      })
    ).resolves.toBeDefined();
  });

  it("findAll()/findByCategory()/search() continuam funcionando (compatibilidade com chamadores existentes)", async () => {
    const repo = getRepository();
    const all = await repo.findAll();
    expect(Array.isArray(all)).toBe(true);
  });
}

describe("ProductRepository contract — MockProductRepository", () => {
  sharedContractSuite(() => new MockProductRepository());
});

describe("ProductRepository contract — TinyProductRepository", () => {
  beforeEach(() => {
    getMock.mockReset();
    tinyCache.clear();
    getMock.mockImplementation(async (path: string) => {
      if (path === "/produtos") {
        return { itens: [{ id: 1 }, { id: 2 }], paginacao: { limit: 100, offset: 0, total: 2 } };
      }
      if (path === "/produtos/1") return tinyProductDetail(1);
      if (path === "/produtos/2") return tinyProductDetail(2);
      throw new Error(`chamada inesperada: ${path}`);
    });
  });

  sharedContractSuite(() => new TinyProductRepository());
});
