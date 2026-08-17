import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ENV_KEYS = [
  "DATA_SOURCE",
  "TINY_CLIENT_ID",
  "TINY_CLIENT_SECRET",
  "TINY_REFRESH_TOKEN",
  "TINY_REQUEST_TIMEOUT_MS",
] as const;

const originalEnv: Record<string, string | undefined> = {};

describe("validateTinyEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("reporta as 3 variáveis como ausentes quando nenhuma está configurada", async () => {
    const { validateTinyEnv } = await import("./env");
    const result = validateTinyEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual(["TINY_CLIENT_ID", "TINY_CLIENT_SECRET", "TINY_REFRESH_TOKEN"]);
      expect(result.invalid).toEqual([]);
    }
  });

  it("passa quando as 3 variáveis têm valores plausíveis", async () => {
    process.env.TINY_CLIENT_ID = "client-abc12345";
    process.env.TINY_CLIENT_SECRET = "secret-abc12345";
    process.env.TINY_REFRESH_TOKEN = "refresh-token-abc12345";

    const { validateTinyEnv } = await import("./env");
    expect(validateTinyEnv()).toEqual({ ok: true });
  });

  it("detecta credencial inválida: valor curto demais", async () => {
    process.env.TINY_CLIENT_ID = "abc"; // < 8 chars
    process.env.TINY_CLIENT_SECRET = "secret-abc12345";
    process.env.TINY_REFRESH_TOKEN = "refresh-token-abc12345";

    const { validateTinyEnv } = await import("./env");
    const result = validateTinyEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.invalid).toContain("TINY_CLIENT_ID");
  });

  it("detecta credencial inválida: contém espaço em branco", async () => {
    process.env.TINY_CLIENT_ID = "client-abc12345";
    process.env.TINY_CLIENT_SECRET = "secret com espaco 123";
    process.env.TINY_REFRESH_TOKEN = "refresh-token-abc12345";

    const { validateTinyEnv } = await import("./env");
    const result = validateTinyEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.invalid).toContain("TINY_CLIENT_SECRET");
  });

  it("detecta credencial inválida: placeholder óbvio (ex.: 'changeme')", async () => {
    process.env.TINY_CLIENT_ID = "client-abc12345";
    process.env.TINY_CLIENT_SECRET = "secret-abc12345";
    process.env.TINY_REFRESH_TOKEN = "changeme";

    const { validateTinyEnv } = await import("./env");
    const result = validateTinyEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.invalid).toContain("TINY_REFRESH_TOKEN");
  });

  it("a mensagem de erro nunca contém o valor de nenhuma variável, só nomes", async () => {
    process.env.TINY_CLIENT_ID = "client-abc12345";
    process.env.TINY_CLIENT_SECRET = ""; // ausente
    process.env.TINY_REFRESH_TOKEN = "changeme"; // inválido

    const { validateTinyEnv } = await import("./env");
    const result = validateTinyEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).not.toContain("client-abc12345");
      expect(result.message).not.toContain("changeme");
      expect(result.message).toContain("TINY_CLIENT_SECRET");
      expect(result.message).toContain("TINY_REFRESH_TOKEN");
    }
  });
});

describe("resolveRequestTimeoutMs", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.TINY_REQUEST_TIMEOUT_MS;
  });

  it("usa o padrão de 8000ms quando a variável não está definida", async () => {
    const { resolveRequestTimeoutMs } = await import("./env");
    expect(resolveRequestTimeoutMs()).toBe(8000);
  });

  it("usa o valor configurado quando é um número positivo válido", async () => {
    process.env.TINY_REQUEST_TIMEOUT_MS = "5000";
    const { resolveRequestTimeoutMs } = await import("./env");
    expect(resolveRequestTimeoutMs()).toBe(5000);
  });

  it("cai para o padrão e avisa quando o valor não é um número válido", async () => {
    process.env.TINY_REQUEST_TIMEOUT_MS = "abc";
    const { resolveRequestTimeoutMs } = await import("./env");
    expect(resolveRequestTimeoutMs()).toBe(8000);
  });

  it("cai para o padrão quando o valor é negativo ou zero", async () => {
    process.env.TINY_REQUEST_TIMEOUT_MS = "-100";
    const { resolveRequestTimeoutMs } = await import("./env");
    expect(resolveRequestTimeoutMs()).toBe(8000);
  });
});

describe("dataSourceConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.DATA_SOURCE;
  });

  it("usa 'mock' como padrão quando DATA_SOURCE não está definida", async () => {
    const { dataSourceConfig } = await import("./env");
    expect(dataSourceConfig.source).toBe("mock");
  });

  it("usa 'tiny' quando DATA_SOURCE=tiny", async () => {
    process.env.DATA_SOURCE = "tiny";
    const { dataSourceConfig } = await import("./env");
    expect(dataSourceConfig.source).toBe("tiny");
  });

  it("qualquer valor não reconhecido cai para 'mock' com segurança", async () => {
    process.env.DATA_SOURCE = "algo-invalido";
    const { dataSourceConfig } = await import("./env");
    expect(dataSourceConfig.source).toBe("mock");
  });
});
