import "server-only";
import { validateTinyEnv } from "@/lib/env";
import { tinyIntegrationService } from "@/lib/repositories/tiny/tiny-integration-service";
import { validateImageUrls, type ImageUrlValidation } from "@/lib/repositories/tiny/tiny-v2-image-validator";
import type { TinyV2MappingResult } from "@/lib/repositories/tiny/tiny-v2-mapper";

export type ImageResolutionResult = {
  source: "v2-direto" | "v2-varredura" | "v3-complementar" | "nenhuma-fonte";
  urls: string[];
  validations: ImageUrlValidation[];
  note: string;
};

/**
 * Resolve as imagens de um produto usando, em ordem: (1) o que o
 * mapeamento v2 já encontrou (diretamente ou via varredura ampla do
 * payload); (2) se nada foi encontrado, tenta a chamada complementar
 * real e confirmada `GET /produtos/{id}/anexos` (API v3 — só funciona
 * se as credenciais v3 também estiverem configuradas). Sempre valida a
 * acessibilidade real (sem login) de cada URL encontrada.
 */
export async function resolveProductImages(
  tinyProductId: string,
  mapping: TinyV2MappingResult
): Promise<ImageResolutionResult> {
  const directUrls = Array.isArray(mapping.mapped.images) ? (mapping.mapped.images as string[]) : [];

  if (directUrls.length > 0) {
    const validations = await validateImageUrls(directUrls);
    const source =
      mapping.fieldStatuses.find((f) => f.key === "images")?.status === "incompatible"
        ? "v2-varredura"
        : "v2-direto";
    return {
      source,
      urls: directUrls,
      validations,
      note:
        source === "v2-direto"
          ? "Imagens encontradas diretamente no payload v2, no campo esperado."
          : "Imagens encontradas por varredura ampla do payload v2 (não no campo esperado) — vale confirmar a estrutura real.",
    };
  }

  const v3CredsValid = validateTinyEnv().ok;
  if (!v3CredsValid) {
    return {
      source: "nenhuma-fonte",
      urls: [],
      validations: [],
      note:
        "Nenhuma imagem encontrada no payload v2, e as credenciais v3 (TINY_CLIENT_ID/TINY_CLIENT_SECRET/TINY_REFRESH_TOKEN) não estão configuradas para tentar a chamada complementar GET /produtos/{id}/anexos. Configure-as para tentar essa via, ou confirme manualmente que o produto realmente não tem foto na Tiny.",
    };
  }

  try {
    const attachments = await tinyIntegrationService.getProductAttachments(tinyProductId);
    const urls = attachments.map((a) => a.url);
    if (urls.length === 0) {
      return {
        source: "nenhuma-fonte",
        urls: [],
        validations: [],
        note: "A chamada complementar GET /produtos/{id}/anexos (v3) também não retornou nenhuma imagem — o produto provavelmente realmente não tem foto cadastrada na Tiny.",
      };
    }
    const validations = await validateImageUrls(urls);
    return {
      source: "v3-complementar",
      urls,
      validations,
      note: `${urls.length} imagem(ns) obtida(s) via chamada complementar GET /produtos/${tinyProductId}/anexos (API v3).`,
    };
  } catch (err) {
    return {
      source: "nenhuma-fonte",
      urls: [],
      validations: [],
      note: `Tentativa de chamada complementar v3 falhou: ${err instanceof Error ? err.message : "erro desconhecido"}.`,
    };
  }
}
