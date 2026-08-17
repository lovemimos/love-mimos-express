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
import { TinyIntegrationService } from "./tiny-integration-service";

const getMock = tinyClient.get as unknown as ReturnType<typeof vi.fn>;

describe("TinyIntegrationService", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  describe("testAuthentication", () => {
    it("ok: true quando a chamada de teste tem sucesso", async () => {
      getMock.mockResolvedValueOnce({ itens: [], paginacao: { limit: 1, offset: 0, total: 0 } });
      const service = new TinyIntegrationService();
      const result = await service.testAuthentication();
      expect(result.ok).toBe(true);
      expect(getMock).toHaveBeenCalledWith("/produtos", { limit: 1, offset: 0 });
    });

    it("ok: false com o 'kind' do erro quando a autenticação falha", async () => {
      getMock.mockRejectedValueOnce(new TinyApiError("token inválido", "auth", 401));
      const service = new TinyIntegrationService();
      const result = await service.testAuthentication();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.kind).toBe("auth");
    });

    it("nunca lança — erros inesperados viram ok: false", async () => {
      getMock.mockRejectedValueOnce(new Error("algo bizarro"));
      const service = new TinyIntegrationService();
      await expect(service.testAuthentication()).resolves.toMatchObject({ ok: false });
    });
  });

  describe("getProductById", () => {
    it("busca o endpoint de detalhe do produto e devolve o payload cru, sem nenhum mapeamento", async () => {
      const rawPayload = { id: 123, descricao: "Produto Teste", precos: { preco: 50 } };
      getMock.mockResolvedValueOnce(rawPayload);

      const service = new TinyIntegrationService();
      const result = await service.getProductById("123");

      expect(getMock).toHaveBeenCalledWith("/produtos/123");
      expect(result).toEqual(rawPayload);
    });

    it("propaga o erro (não engole falhas silenciosamente, ao contrário do testAuthentication)", async () => {
      getMock.mockRejectedValueOnce(new TinyApiError("timeout", "timeout"));
      const service = new TinyIntegrationService();
      await expect(service.getProductById("123")).rejects.toThrow("timeout");
    });
  });

  describe("getProductAttachments", () => {
    it("busca o endpoint de anexos e devolve só os itens com URL utilizável", async () => {
      getMock.mockResolvedValueOnce({
        itens: [
          { id: 1, url: "https://tiny.com.br/a.jpg", externo: false },
          { id: 2, url: null },
        ],
      });
      const service = new TinyIntegrationService();
      const result = await service.getProductAttachments("123");
      expect(getMock).toHaveBeenCalledWith("/produtos/123/anexos");
      expect(result).toEqual([{ id: "1", url: "https://tiny.com.br/a.jpg", externo: false }]);
    });

    it("devolve array vazio quando não há nenhum anexo", async () => {
      getMock.mockResolvedValueOnce({ itens: [] });
      const service = new TinyIntegrationService();
      const result = await service.getProductAttachments("123");
      expect(result).toEqual([]);
    });
  });
});
