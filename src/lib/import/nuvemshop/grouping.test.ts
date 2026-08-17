import { describe, it, expect } from "vitest";
import { groupNuvemshopRows } from "./grouping";
import { row } from "./test-fixtures";

describe("groupNuvemshopRows", () => {
  it("agrupa linhas pelo Identificador URL", () => {
    const rows = [
      row({ "Identificador URL": "produto-a", Nome: "Produto A", Preço: "10" }),
      row({ "Identificador URL": "produto-b", Nome: "Produto B", Preço: "20" }),
    ];
    const groups = groupNuvemshopRows(rows);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.identifierUrl)).toEqual(["produto-a", "produto-b"]);
  });

  it("preenche os campos de produto (Nome, Categorias) nas linhas de variação em branco", () => {
    const rows = [
      row({
        "Identificador URL": "cilios-6d",
        Nome: "Cílios 6D",
        Categorias: "Extensão de Cílios > CÍLIOS",
        "Valor da variação 1": "8mm",
        Preço: "43.90",
      }),
      row({ "Identificador URL": "cilios-6d", "Valor da variação 1": "9mm", Preço: "43.90" }),
      row({ "Identificador URL": "cilios-6d", "Valor da variação 1": "10mm", Preço: "43.90" }),
    ];
    const [group] = groupNuvemshopRows(rows);
    expect(group.productFields.Nome).toBe("Cílios 6D");
    expect(group.productFields.Categorias).toBe("Extensão de Cílios > CÍLIOS");
    expect(group.variantRows).toHaveLength(3);
    expect(group.variantRows[1].Nome).toBe("");
  });

  it("mantém a ordem original dos grupos e das linhas dentro de cada grupo", () => {
    const rows = [
      row({ "Identificador URL": "b", Nome: "B" }),
      row({ "Identificador URL": "a", Nome: "A" }),
      row({ "Identificador URL": "b", "Valor da variação 1": "v2" }),
    ];
    const groups = groupNuvemshopRows(rows);
    expect(groups.map((g) => g.identifierUrl)).toEqual(["b", "a"]);
    expect(groups[0].variantRows.map((r) => r["Valor da variação 1"])).toEqual(["", "v2"]);
  });
});
