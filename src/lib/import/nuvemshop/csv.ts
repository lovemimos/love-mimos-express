/**
 * Parses semicolon-delimited CSV text into rows of string cells,
 * handling RFC4180-style quoting (`"a;b"`, `""` as an escaped quote,
 * and newlines embedded inside a quoted field). A naive `line.split(";")`
 * would break on this export — `Descrição` contains raw HTML with
 * commas, semicolons, and literal double quotes.
 *
 * Deliberately hand-written instead of adding a CSV library dependency
 * — this is a small, well-tested parsing utility, not a new
 * architectural piece.
 */
export function parseCsv(text: string, delimiter = ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++; // skip the second quote of the escaped pair
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // ignore — handled by the \n case below
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // last row (file may or may not end with a trailing newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

/**
 * Parses the CSV and zips each row against the header row, producing
 * one object per data row keyed by the exact column name. Throws if a
 * row has a different number of cells than the header — that's a real
 * structural problem worth failing loudly on, not silently misaligning
 * columns.
 */
export function parseCsvAsRecords(text: string, delimiter = ";"): Record<string, string>[] {
  const rows = parseCsv(text, delimiter);
  if (rows.length === 0) return [];

  const [header, ...dataRows] = rows;
  return dataRows.map((row, index) => {
    if (row.length !== header.length) {
      throw new Error(
        `Linha ${index + 2} tem ${row.length} colunas, esperado ${header.length} (cabeçalho). Estrutura do arquivo pode estar corrompida.`
      );
    }
    const record: Record<string, string> = {};
    header.forEach((col, i) => {
      record[col] = row[i];
    });
    return record;
  });
}
