import { describe, it, expect, vi, afterEach } from "vitest";
import { testTinyV2Connection } from "./tiny-v2-connection-test";

function mockFetchOnce(response: { ok: boolean; status?: number; json: () => Promise<unknown> }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce({ ok: response.ok, status: response.status ?? 200, json: response.json })
  );
}

describe("testTinyV2Connection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TINY_API_TOKEN;
  });

  it("missing-token quando TINY_API_TOKEN não está definido", async () => {
    delete process.env.TINY_API_TOKEN;
    const result = await testTinyV2Connection("123");
    expect(result.kind).toBe("missing-token");
  });

  it("missing-token quando TINY_API_TOKEN está vazio", async () => {
    process.env.TINY_API_TOKEN = "   ";
    const result = await testTinyV2Connection("123");
    expect(result.kind).toBe("missing-token");
  });

  it("network-error quando o fetch falha (sem conexão, DNS, etc.)", async () => {
    process.env.TINY_API_TOKEN = "token-valido";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND")));
    const result = await testTinyV2Connection("123");
    expect(result.kind).toBe("network-error");
    if (result.kind === "network-error") expect(result.message).toContain("ENOTFOUND");
  });

  it("nunca inclui o token na mensagem de erro de rede", async () => {
    process.env.TINY_API_TOKEN = "segredo-super-secreto-123";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("falha genérica")));
    const result = await testTinyV2Connection("123");
    expect(JSON.stringify(result)).not.toContain("segredo-super-secreto-123");
  });

  it("api-error quando o HTTP não é 2xx", async () => {
    process.env.TINY_API_TOKEN = "token-valido";
    mockFetchOnce({ ok: false, status: 500, json: async () => ({}) });
    const result = await testTinyV2Connection("123");
    expect(result.kind).toBe("api-error");
    if (result.kind === "api-error") expect(result.message).toContain("500");
  });

  it("success com o produto quando retorno.status é OK", async () => {
    process.env.TINY_API_TOKEN = "token-valido";
    mockFetchOnce({
      ok: true,
      json: async () => ({ retorno: { status: "OK", produto: { id: 123, nome: "Produto Teste" } } }),
    });
    const result = await testTinyV2Connection("123");
    expect(result.kind).toBe("success");
    if (result.kind === "success") expect(result.product).toEqual({ id: 123, nome: "Produto Teste" });
  });

  it("auth-error quando a mensagem de erro da Tiny menciona token/autenticação", async () => {
    process.env.TINY_API_TOKEN = "token-invalido";
    mockFetchOnce({
      ok: true,
      json: async () => ({
        retorno: { status: "Erro", codigo_erro: "1", erros: [{ erro: "Token inválido ou não autenticado" }] },
      }),
    });
    const result = await testTinyV2Connection("123");
    expect(result.kind).toBe("auth-error");
    if (result.kind === "auth-error") expect(result.rawCode).toBe("1");
  });

  it("not-found quando a mensagem de erro da Tiny menciona registro não encontrado", async () => {
    process.env.TINY_API_TOKEN = "token-valido";
    mockFetchOnce({
      ok: true,
      json: async () => ({
        retorno: { status: "Erro", erros: [{ erro: "Produto não encontrado" }] },
      }),
    });
    const result = await testTinyV2Connection("999999999");
    expect(result.kind).toBe("not-found");
  });

  it("permission-error quando a mensagem de erro da Tiny menciona permissão", async () => {
    process.env.TINY_API_TOKEN = "token-valido";
    mockFetchOnce({
      ok: true,
      json: async () => ({
        retorno: { status: "Erro", erros: [{ erro: "Sem permissão para acessar este recurso" }] },
      }),
    });
    const result = await testTinyV2Connection("123");
    expect(result.kind).toBe("permission-error");
  });

  it("api-error genérico quando o erro não se encaixa em nenhuma categoria conhecida", async () => {
    process.env.TINY_API_TOKEN = "token-valido";
    mockFetchOnce({
      ok: true,
      json: async () => ({ retorno: { status: "Erro", erros: [{ erro: "Algo inesperado aconteceu" }] } }),
    });
    const result = await testTinyV2Connection("123");
    expect(result.kind).toBe("api-error");
  });

  it("envia o token no corpo da requisição, não expõe na URL", async () => {
    process.env.TINY_API_TOKEN = "token-abc";
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ retorno: { status: "OK", produto: {} } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await testTinyV2Connection("744931523");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).not.toContain("token-abc");
    expect(options.body.toString()).toContain("token=token-abc");
  });
});
