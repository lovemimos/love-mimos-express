import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvAsRecords } from "./csv";

describe("parseCsv", () => {
  it("separa campos simples pelo delimitador", () => {
    expect(parseCsv("a;b;c\n1;2;3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("respeita campos entre aspas contendo o delimitador", () => {
    const result = parseCsv('a;"valor;com;delimitador";c\n');
    expect(result).toEqual([["a", "valor;com;delimitador", "c"]]);
  });

  it('decodifica aspas duplas escapadas ("") dentro de um campo entre aspas', () => {
    const csv = 'a;"texto com ""aspas"" dentro";c\n';
    const result = parseCsv(csv);
    expect(result[0][1]).toBe('texto com "aspas" dentro');
  });

  it("lida com HTML contendo vírgulas e aspas dentro de um campo entre aspas", () => {
    const csv = 'Nome;Descrição\n"Produto";"<p class=""foo"">Texto, com vírgula</p>"\n';
    const result = parseCsv(csv);
    expect(result[1][1]).toBe('<p class="foo">Texto, com vírgula</p>');
  });

  it("ignora linhas totalmente vazias no fim do arquivo", () => {
    const result = parseCsv("a;b\n1;2\n\n");
    expect(result).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsvAsRecords", () => {
  it("associa cada linha ao cabeçalho pelo nome exato da coluna", () => {
    const csv = "Nome;SKU\nCílios;ABC123\n";
    const records = parseCsvAsRecords(csv);
    expect(records).toEqual([{ Nome: "Cílios", SKU: "ABC123" }]);
  });

  it("lança erro claro quando uma linha tem número de colunas diferente do cabeçalho", () => {
    const csv = "Nome;SKU\nCílios\n"; // linha com só 1 coluna, cabeçalho tem 2
    expect(() => parseCsvAsRecords(csv)).toThrow(/2 colunas|colunas.*cabeçalho/i);
  });

  it("array vazio para um CSV vazio", () => {
    expect(parseCsvAsRecords("")).toEqual([]);
  });
});
