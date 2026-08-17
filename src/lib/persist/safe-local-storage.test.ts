import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSafeLocalStorage } from "./safe-local-storage";

function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
}

describe("createSafeLocalStorage", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal("window", { localStorage: localStorageMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getItem devolve null quando a chave não existe", () => {
    const storage = createSafeLocalStorage("test");
    expect(storage.getItem("chave-inexistente")).toBeNull();
  });

  it("setItem grava e getItem lê o mesmo valor de volta", () => {
    const storage = createSafeLocalStorage<{ foo: string }>("test");
    storage.setItem("k", { state: { foo: "bar" }, version: 0 });
    expect(storage.getItem("k")).toEqual({ state: { foo: "bar" }, version: 0 });
  });

  it("getItem com JSON corrompido devolve null em vez de lançar", () => {
    localStorageMock.setItem("k", "{isso não é json!!!");
    const storage = createSafeLocalStorage("test");
    expect(() => storage.getItem("k")).not.toThrow();
    expect(storage.getItem("k")).toBeNull();
  });

  it("getItem com JSON corrompido limpa a chave corrompida", () => {
    localStorageMock.setItem("k", "não-json");
    const storage = createSafeLocalStorage("test");
    storage.getItem("k");
    expect(localStorageMock.getItem("k")).toBeNull();
  });

  it("removeItem remove a chave", () => {
    const storage = createSafeLocalStorage<{ foo: string }>("test");
    storage.setItem("k", { state: { foo: "bar" }, version: 0 });
    storage.removeItem("k");
    expect(storage.getItem("k")).toBeNull();
  });

  it("nunca lança quando `window` não está definido (contexto de servidor)", () => {
    vi.unstubAllGlobals();
    const storage = createSafeLocalStorage("test");
    expect(() => storage.getItem("k")).not.toThrow();
    expect(storage.getItem("k")).toBeNull();
  });
});
