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
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
    _raw: store,
  };
}

describe("useCartStore", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    vi.resetModules();
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal("window", { localStorage: localStorageMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adição: adiciona um novo produto ao carrinho", async () => {
    const { useCartStore } = await import("./cart-store");
    useCartStore.getState().addItem({ productId: "p-1", quantity: 1 });
    expect(useCartStore.getState().lines).toEqual([{ productId: "p-1", quantity: 1 }]);
  });

  it("produto repetido: adicionar de novo incrementa a quantidade, não duplica a linha", async () => {
    const { useCartStore } = await import("./cart-store");
    useCartStore.getState().addItem({ productId: "p-1", quantity: 1 });
    useCartStore.getState().addItem({ productId: "p-1", quantity: 2 });

    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
  });

  it("produto com variação diferente vira uma linha separada (não é o 'mesmo produto')", async () => {
    const { useCartStore } = await import("./cart-store");
    useCartStore.getState().addItem({ productId: "p-1", variantId: "v-a", quantity: 1 });
    useCartStore.getState().addItem({ productId: "p-1", variantId: "v-b", quantity: 1 });
    expect(useCartStore.getState().lines).toHaveLength(2);
  });

  it("remoção: removeItem tira a linha do carrinho", async () => {
    const { useCartStore } = await import("./cart-store");
    useCartStore.getState().addItem({ productId: "p-1", quantity: 1 });
    useCartStore.getState().removeItem("p-1");
    expect(useCartStore.getState().lines).toEqual([]);
  });

  it("quantidade: setQuantity atualiza a quantidade da linha", async () => {
    const { useCartStore } = await import("./cart-store");
    useCartStore.getState().addItem({ productId: "p-1", quantity: 1 });
    useCartStore.getState().setQuantity("p-1", 5);
    expect(useCartStore.getState().lines[0].quantity).toBe(5);
  });

  it("quantidade: setQuantity para 0 remove a linha automaticamente", async () => {
    const { useCartStore } = await import("./cart-store");
    useCartStore.getState().addItem({ productId: "p-1", quantity: 3 });
    useCartStore.getState().setQuantity("p-1", 0);
    expect(useCartStore.getState().lines).toEqual([]);
  });

  it("quantidade: setQuantity negativa também remove a linha", async () => {
    const { useCartStore } = await import("./cart-store");
    useCartStore.getState().addItem({ productId: "p-1", quantity: 3 });
    useCartStore.getState().setQuantity("p-1", -1);
    expect(useCartStore.getState().lines).toEqual([]);
  });

  it("existência: hasItem consulta corretamente se um produto/variação está no carrinho", async () => {
    const { useCartStore } = await import("./cart-store");
    useCartStore.getState().addItem({ productId: "p-1", variantId: "v-a", quantity: 1 });

    expect(useCartStore.getState().hasItem("p-1", "v-a")).toBe(true);
    expect(useCartStore.getState().hasItem("p-1", "v-b")).toBe(false);
    expect(useCartStore.getState().hasItem("p-2")).toBe(false);
  });

  it("limpeza: clear esvazia o carrinho inteiro", async () => {
    const { useCartStore } = await import("./cart-store");
    useCartStore.getState().addItem({ productId: "p-1", quantity: 1 });
    useCartStore.getState().addItem({ productId: "p-2", quantity: 2 });
    useCartStore.getState().clear();
    expect(useCartStore.getState().lines).toEqual([]);
  });

  it("persistência: o carrinho é escrito no localStorage após uma mutação", async () => {
    const { useCartStore } = await import("./cart-store");
    useCartStore.getState().addItem({ productId: "p-1", quantity: 2 });

    // dá um tick para o zustand persist (assíncrono) escrever
    await new Promise((r) => setTimeout(r, 0));

    const raw = localStorageMock.getItem("love-mimos-cart");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).state.lines).toEqual([{ productId: "p-1", quantity: 2 }]);
  });

  it("recuperação: reabrir o app (nova instância do store) restaura o carrinho salvo", async () => {
    const first = await import("./cart-store");
    first.useCartStore.getState().addItem({ productId: "p-1", quantity: 4 });
    await new Promise((r) => setTimeout(r, 0));

    // Simula "reabrir o app": novo registro de módulos, nova instância do store,
    // lendo do MESMO localStorage mock.
    vi.resetModules();
    const second = await import("./cart-store");
    await new Promise((r) => setTimeout(r, 0));

    expect(second.useCartStore.getState().lines).toEqual([{ productId: "p-1", quantity: 4 }]);
  });

  it("dados corrompidos: localStorage com JSON inválido não derruba o app — carrinho reinicia vazio", async () => {
    localStorageMock.setItem("love-mimos-cart", "{isso não é json válido!!!");

    const { useCartStore } = await import("./cart-store");
    await new Promise((r) => setTimeout(r, 0));

    expect(useCartStore.getState().lines).toEqual([]);
    // A chave corrompida é limpa, não fica presa num estado quebrado.
    expect(localStorageMock.getItem("love-mimos-cart")).toBeNull();
  });

  it("dados corrompidos: o carrinho continua funcionando normalmente após a recuperação", async () => {
    localStorageMock.setItem("love-mimos-cart", "não-json");
    const { useCartStore } = await import("./cart-store");
    await new Promise((r) => setTimeout(r, 0));

    useCartStore.getState().addItem({ productId: "p-1", quantity: 1 });
    expect(useCartStore.getState().lines).toEqual([{ productId: "p-1", quantity: 1 }]);
  });
});
