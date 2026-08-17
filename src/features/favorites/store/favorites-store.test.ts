import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

describe("useFavoritesStore", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    vi.resetModules();
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal("window", { localStorage: localStorageMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adição: add favorita um produto", async () => {
    const { useFavoritesStore } = await import("./favorites-store");
    useFavoritesStore.getState().add("p-1");
    expect(useFavoritesStore.getState().entries.map((e) => e.productId)).toEqual(["p-1"]);
  });

  it("sem duplicação: favoritar o mesmo produto duas vezes não cria uma segunda entrada", async () => {
    const { useFavoritesStore } = await import("./favorites-store");
    useFavoritesStore.getState().add("p-1");
    useFavoritesStore.getState().add("p-1");
    expect(useFavoritesStore.getState().entries).toHaveLength(1);
  });

  it("remoção: remove tira o produto dos favoritos", async () => {
    const { useFavoritesStore } = await import("./favorites-store");
    useFavoritesStore.getState().add("p-1");
    useFavoritesStore.getState().remove("p-1");
    expect(useFavoritesStore.getState().entries).toEqual([]);
  });

  it("toggle: favorita quando não é favorito, desfavorita quando já é", async () => {
    const { useFavoritesStore } = await import("./favorites-store");
    useFavoritesStore.getState().toggle("p-1");
    expect(useFavoritesStore.getState().isFavorite("p-1")).toBe(true);
    useFavoritesStore.getState().toggle("p-1");
    expect(useFavoritesStore.getState().isFavorite("p-1")).toBe(false);
  });

  it("existência: isFavorite consulta corretamente", async () => {
    const { useFavoritesStore } = await import("./favorites-store");
    useFavoritesStore.getState().add("p-1");
    expect(useFavoritesStore.getState().isFavorite("p-1")).toBe(true);
    expect(useFavoritesStore.getState().isFavorite("p-2")).toBe(false);
  });

  it("limpeza: clear esvazia todos os favoritos", async () => {
    const { useFavoritesStore } = await import("./favorites-store");
    useFavoritesStore.getState().add("p-1");
    useFavoritesStore.getState().add("p-2");
    useFavoritesStore.getState().clear();
    expect(useFavoritesStore.getState().entries).toEqual([]);
  });

  it("persistência: favoritos são escritos no localStorage", async () => {
    const { useFavoritesStore } = await import("./favorites-store");
    useFavoritesStore.getState().add("p-1");
    await new Promise((r) => setTimeout(r, 0));

    const raw = localStorageMock.getItem("love-mimos-favorites");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).state.entries[0].productId).toBe("p-1");
  });

  it("recuperação: reabrir o app restaura os favoritos salvos", async () => {
    const first = await import("./favorites-store");
    first.useFavoritesStore.getState().add("p-1");
    await new Promise((r) => setTimeout(r, 0));

    vi.resetModules();
    const second = await import("./favorites-store");
    await new Promise((r) => setTimeout(r, 0));

    expect(second.useFavoritesStore.getState().entries.map((e) => e.productId)).toEqual(["p-1"]);
  });

  it("dados corrompidos: JSON inválido não derruba o app — favoritos reiniciam vazios", async () => {
    localStorageMock.setItem("love-mimos-favorites", "{não é json válido!!!");
    const { useFavoritesStore } = await import("./favorites-store");
    await new Promise((r) => setTimeout(r, 0));

    expect(useFavoritesStore.getState().entries).toEqual([]);
    expect(localStorageMock.getItem("love-mimos-favorites")).toBeNull();
  });
});
