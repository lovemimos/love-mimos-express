import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("TinyClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
    process.env.TINY_CLIENT_ID = "test-client-id";
    process.env.TINY_CLIENT_SECRET = "test-client-secret";
    process.env.TINY_REFRESH_TOKEN = "test-refresh-token";
    process.env.TINY_REQUEST_TIMEOUT_MS = "50";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("falha de autenticação: token endpoint retornando 401 vira TinyApiError do tipo 'auth'", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const { tinyClient, TinyApiError } = await import("./tiny-client");

    await expect(tinyClient.get("/produtos")).rejects.toBeInstanceOf(TinyApiError);
    await expect(tinyClient.get("/produtos")).rejects.toMatchObject({
      name: "TinyApiError",
      kind: "auth",
      status: 401,
    });
  });

  it("timeout: a chamada não resolve dentro do prazo e vira TinyApiError do tipo 'timeout' ou 'auth' (abortado em qualquer etapa)", async () => {
    global.fetch = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        })
    ) as unknown as typeof fetch;

    const { tinyClient } = await import("./tiny-client");

    await expect(tinyClient.get("/produtos")).rejects.toMatchObject({
      name: "TinyApiError",
      kind: "timeout",
    });
  }, 10_000);

  it("401 em uma chamada de dados (token já válido) também vira erro do tipo 'auth'", async () => {
    let call = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      call += 1;
      if (call === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: "abc", expires_in: 3600 }),
        };
      }
      return { ok: false, status: 401, headers: new Headers(), json: async () => ({}) };
    }) as unknown as typeof fetch;

    const { tinyClient } = await import("./tiny-client");
    await expect(tinyClient.get("/produtos")).rejects.toMatchObject({
      kind: "auth",
      status: 401,
    });
  });

  it("403 (permissão insuficiente) vira erro do tipo 'auth', não 'http' genérico", async () => {
    let call = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      call += 1;
      if (call === 1) {
        return { ok: true, status: 200, json: async () => ({ access_token: "abc", expires_in: 3600 }) };
      }
      return { ok: false, status: 403, headers: new Headers(), json: async () => ({}) };
    }) as unknown as typeof fetch;

    const { tinyClient } = await import("./tiny-client");
    await expect(tinyClient.get("/produtos")).rejects.toMatchObject({ kind: "auth", status: 403 });
  });

  it("404 (recurso não encontrado) vira erro do tipo 'http' com status preservado", async () => {
    let call = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      call += 1;
      if (call === 1) {
        return { ok: true, status: 200, json: async () => ({ access_token: "abc", expires_in: 3600 }) };
      }
      return { ok: false, status: 404, headers: new Headers(), json: async () => ({}) };
    }) as unknown as typeof fetch;

    const { tinyClient } = await import("./tiny-client");
    await expect(tinyClient.get("/produtos/999999")).rejects.toMatchObject({ kind: "http", status: 404 });
  });

  it("429 (rate limit excedido) vira erro do tipo 'http', tratado como qualquer outra falha", async () => {
    let call = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      call += 1;
      if (call === 1) {
        return { ok: true, status: 200, json: async () => ({ access_token: "abc", expires_in: 3600 }) };
      }
      return {
        ok: false,
        status: 429,
        headers: new Headers({ "X-RateLimit-Remaining": "0" }),
        json: async () => ({}),
      };
    }) as unknown as typeof fetch;

    const { tinyClient } = await import("./tiny-client");
    await expect(tinyClient.get("/produtos")).rejects.toMatchObject({ kind: "http", status: 429 });
  });

  it("500 (erro interno da Tiny) vira erro do tipo 'http'", async () => {
    let call = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      call += 1;
      if (call === 1) {
        return { ok: true, status: 200, json: async () => ({ access_token: "abc", expires_in: 3600 }) };
      }
      return { ok: false, status: 500, headers: new Headers(), json: async () => ({}) };
    }) as unknown as typeof fetch;

    const { tinyClient } = await import("./tiny-client");
    await expect(tinyClient.get("/produtos")).rejects.toMatchObject({ kind: "http", status: 500 });
  });

  it("JSON inesperado/corrompido na resposta vira erro do tipo 'network', não quebra sem tipo", async () => {
    let call = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      call += 1;
      if (call === 1) {
        return { ok: true, status: 200, json: async () => ({ access_token: "abc", expires_in: 3600 }) };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON");
        },
      };
    }) as unknown as typeof fetch;

    const { tinyClient, TinyApiError } = await import("./tiny-client");
    await expect(tinyClient.get("/produtos")).rejects.toBeInstanceOf(TinyApiError);
  });

  it("falha temporária de rede (fetch rejeita) vira erro do tipo 'network'", async () => {
    let call = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      call += 1;
      if (call === 1) {
        return { ok: true, status: 200, json: async () => ({ access_token: "abc", expires_in: 3600 }) };
      }
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;

    const { tinyClient } = await import("./tiny-client");
    await expect(tinyClient.get("/produtos")).rejects.toMatchObject({ kind: "network" });
  });

  it("retry: sucede na 2ª tentativa depois de uma falha de rede transitória", async () => {
    let dataCall = 0;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("openid-connect/token")) {
        return { ok: true, status: 200, json: async () => ({ access_token: "abc", expires_in: 3600 }) };
      }
      dataCall += 1;
      if (dataCall === 1) throw new TypeError("fetch failed"); // 1ª tentativa falha
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ itens: [], paginacao: { limit: 100, offset: 0, total: 0 } }),
      };
    }) as unknown as typeof fetch;

    const { tinyClient } = await import("./tiny-client");
    const result = await tinyClient.get("/produtos");
    expect(result).toEqual({ itens: [], paginacao: { limit: 100, offset: 0, total: 0 } });
    expect(dataCall).toBe(2); // 1 falha + 1 sucesso, nunca chegou à 3ª tentativa
  });

  it("retry: erro de autenticação (401) nunca é retentado — falha na primeira tentativa", async () => {
    let dataCall = 0;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("openid-connect/token")) {
        return { ok: true, status: 200, json: async () => ({ access_token: "abc", expires_in: 3600 }) };
      }
      dataCall += 1;
      return { ok: false, status: 401, headers: new Headers(), json: async () => ({}) };
    }) as unknown as typeof fetch;

    const { tinyClient } = await import("./tiny-client");
    await expect(tinyClient.get("/produtos")).rejects.toMatchObject({ kind: "auth", status: 401 });
    expect(dataCall).toBe(1); // nenhuma retentativa para erro de autenticação
  });
});
