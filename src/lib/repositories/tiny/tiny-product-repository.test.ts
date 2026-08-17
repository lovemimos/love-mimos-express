import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./tiny-client", () => {
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
  return {
    tinyClient: { get: vi.fn() },
    TinyApiError,
  };
});

import { tinyClient, TinyApiError } from "./tiny-client";
import { TinyProductRepository } from "./tiny-product-repository";
import { tinyCache } from "./cache";

const getMock = tinyClient.get as unknown as ReturnType<typeof vi.fn>;

function tinyProductDetail(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    sku: `SKU-${id}`,
    descricao: `Produto ${id}`,
    situacao: "A",
    precos: { preco: 10 + id, precoPromocional: null },
    estoque: { quantidade: 5 },
    anexos: [],
    ...overrides,
  };
}

describe("TinyProductRepository", () => {
  beforeEach(() => {
    getMock.mockReset();
    tinyCache.clear();
  });

  it("resposta vazia: lista sem itens retorna catálogo vazio, sem chamar detalhe nem cair no fallback", async () => {
    getMock.mockResolvedValueOnce({
      itens: [],
      paginacao: { limit: 100, offset: 0, total: 0 },
    });

    const repo = new TinyProductRepository();
    const result = await repo.findAll();

    expect(result).toEqual([]);
    expect(getMock).toHaveBeenCalledTimes(1); // só a chamada de listagem
  });

  it("paginação: percorre múltiplas páginas até cobrir o total informado", async () => {
    getMock.mockImplementation(async (path: string, params?: Record<string, unknown>) => {
      if (path === "/produtos") {
        if (params?.offset === 0) {
          return {
            itens: [{ id: 1 }, { id: 2 }],
            paginacao: { limit: 100, offset: 0, total: 150 },
          };
        }
        if (params?.offset === 100) {
          return {
            itens: [{ id: 3 }],
            paginacao: { limit: 100, offset: 100, total: 150 },
          };
        }
      }
      if (path === "/produtos/1") return tinyProductDetail(1);
      if (path === "/produtos/2") return tinyProductDetail(2);
      if (path === "/produtos/3") return tinyProductDetail(3);
      throw new Error(`chamada inesperada: ${path}`);
    });

    const repo = new TinyProductRepository();
    const result = await repo.findAll();

    expect(result).toHaveLength(3);
    // 2 chamadas de listagem (offset 0 e 100) + 3 chamadas de detalhe
    const listCalls = getMock.mock.calls.filter(([path]) => path === "/produtos");
    expect(listCalls).toHaveLength(2);
    expect(listCalls[1][1]).toMatchObject({ offset: 100 });
  });

  it("fallback controlado: se a Tiny falhar (auth/timeout/http), cai para o catálogo mock em vez de propagar o erro", async () => {
    getMock.mockRejectedValue(new TinyApiError("falhou", "auth", 401));

    const repo = new TinyProductRepository();
    const result = await repo.findAll();

    // Não deve lançar, e deve devolver o catálogo mock real (não vazio).
    expect(result.length).toBeGreaterThan(0);
  });

  it("fallback controlado também se aplica a findBySlug", async () => {
    getMock.mockRejectedValue(new TinyApiError("timeout", "timeout"));

    const repo = new TinyProductRepository();
    const result = await repo.findBySlug("cilios-volume-russo-0-07"); // slug real do mock

    expect(result).toBeDefined();
    expect(result?.name).toContain("Cílios");
  });

  it("produto inativo é filtrado antes de chegar ao catálogo final", async () => {
    getMock.mockImplementation(async (path: string) => {
      if (path === "/produtos") {
        return {
          itens: [{ id: 1 }, { id: 2 }],
          paginacao: { limit: 100, offset: 0, total: 2 },
        };
      }
      if (path === "/produtos/1") return tinyProductDetail(1, { situacao: "A" });
      if (path === "/produtos/2") return tinyProductDetail(2, { situacao: "I" });
      throw new Error(`chamada inesperada: ${path}`);
    });

    const repo = new TinyProductRepository();
    const result = await repo.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("resposta incompleta: um produto com payload malformado não derruba o findAll inteiro", async () => {
    getMock.mockImplementation(async (path: string) => {
      if (path === "/produtos") {
        return {
          itens: [{ id: 1 }, { id: 2 }],
          paginacao: { limit: 100, offset: 0, total: 2 },
        };
      }
      if (path === "/produtos/1") return tinyProductDetail(1);
      // Produto 2: payload incompleto (sem 'precos', sem 'descricao') —
      // o mapper deve simplesmente excluir esse item, não lançar.
      if (path === "/produtos/2") return { id: 2, situacao: "A" };
      throw new Error(`chamada inesperada: ${path}`);
    });

    const repo = new TinyProductRepository();
    const result = await repo.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});
