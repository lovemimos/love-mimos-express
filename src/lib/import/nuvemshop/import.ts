import type { Product } from "@/types";
import { parseCsvAsRecords } from "@/lib/import/nuvemshop/csv";
import { groupNuvemshopRows } from "@/lib/import/nuvemshop/grouping";
import { mapNuvemshopGroup } from "@/lib/import/nuvemshop/mapper";
import type { NuvemshopRawRow, ImportReport, MappedProduct } from "@/lib/import/nuvemshop/types";

/**
 * A product from the current catalog matches an imported one if either
 * its `sku` matches the imported identifier (when that identifier came
 * from a real SKU), or its `slug` matches (the Nuvemshop
 * `Identificador URL`, which is always present and 1:1 per product,
 * making it a reliable fallback match key for the ~84% of rows without
 * a SKU — see docs/features/nuvemshop-import.md).
 */
function findExisting(catalog: Product[], mapped: MappedProduct): Product | undefined {
  return catalog.find(
    (p) => (mapped.sku && p.sku === mapped.sku) || p.slug === mapped.slug
  );
}

export function runNuvemshopImport(csvText: string, currentCatalog: Product[]): ImportReport {
  const report: ImportReport = {
    created: [],
    updated: [],
    variantsImported: 0,
    ignored: [],
    errors: [],
  };

  let rawRows: NuvemshopRawRow[];
  try {
    rawRows = parseCsvAsRecords(csvText) as unknown as NuvemshopRawRow[];
  } catch (err) {
    report.errors.push({
      rowIndex: -1,
      identifierUrl: "",
      message: err instanceof Error ? err.message : "Falha ao ler o CSV",
    });
    return report;
  }

  const groups = groupNuvemshopRows(rawRows);

  groups.forEach((group, index) => {
    const result = mapNuvemshopGroup(group);

    if (result.kind === "error") {
      report.errors.push({ rowIndex: index, identifierUrl: group.identifierUrl, message: result.message });
      return;
    }

    if (result.kind === "ignored") {
      report.ignored.push({
        identifierUrl: group.identifierUrl,
        name: group.productFields.Nome?.trim() || "(sem nome)",
        reason: result.reason,
      });
      return;
    }

    const existing = findExisting(currentCatalog, result.product);
    if (existing) {
      report.updated.push(result.product);
    } else {
      report.created.push(result.product);
    }
    report.variantsImported += result.product.variants?.length ?? 1;
  });

  return report;
}
