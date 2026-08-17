import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  validateTinyEnv: vi.fn(),
}));
vi.mock("./tiny-integration-service", () => ({
  tinyIntegrationService: { getProductAttachments: vi.fn() },
}));
vi.mock("./tiny-v2-image-validator", () => ({
  validateImageUrls: vi.fn(),
}));

import { validateTinyEnv } from "@/lib/env";
import { tinyIntegrationService } from "./tiny-integration-service";
import { validateImageUrls } from "./tiny-v2-image-validator";
import { resolveProductImages } from "./tiny-v2-image-resolution";
import type { TinyV2MappingResult } from "./tiny-v2-mapper";

const getAttachmentsMock = tinyIntegrationService.getProductAttachments as unknown as ReturnType<typeof vi.fn>;
const validateMock = validateImageUrls as unknown as ReturnType<typeof vi.fn>;
const validateTinyEnvMock = validateTinyEnv as unknown as ReturnType<typeof vi.fn>;

function mappingWith(images: unknown, status: "mapped" | "missing" | "incompatible" = "mapped"): TinyV2MappingResult {
  return {
    mapped: { images },
    fieldStatuses: [{ key: "images", label: "Imagens", status, value: images }],
    imagesNote: "",
    stockNote: "",
    variantsNote: "",
  };
}

describe("resolveProductImages", () => {
  beforeEach(() => {
    getAttachmentsMock.mockReset();
    validateMock.mockReset();
    validateTinyEnvMock.mockReset();
    validateTinyEnvMock.mockReturnValue({ ok: false, message: "ausente(s): TINY_CLIENT_ID" });
  });

  it("usa direto as URLs já encontradas pelo mapper v2 (source: v2-direto)", async () => {
    validateMock.mockResolvedValueOnce([{ url: "https://x.com/a.jpg", accessible: true, status: 200 }]);
    const result = await resolveProductImages("123", mappingWith(["https://x.com/a.jpg"], "mapped"));
    expect(result.source).toBe("v2-direto");
    expect(result.urls).toEqual(["https://x.com/a.jpg"]);
    expect(getAttachmentsMock).not.toHaveBeenCalled();
  });

  it("marca como v2-varredura quando o status do campo é 'incompatible' (achado por fallback)", async () => {
    validateMock.mockResolvedValueOnce([{ url: "https://x.com/a.jpg", accessible: true, status: 200 }]);
    const result = await resolveProductImages("123", mappingWith(["https://x.com/a.jpg"], "incompatible"));
    expect(result.source).toBe("v2-varredura");
  });

  it("sem imagens na v2 e sem credenciais v3: não tenta a chamada complementar", async () => {
    const result = await resolveProductImages("123", mappingWith([], "missing"));
    expect(result.source).toBe("nenhuma-fonte");
    expect(getAttachmentsMock).not.toHaveBeenCalled();
    expect(result.note).toContain("TINY_CLIENT_ID");
  });

  it("sem imagens na v2, com credenciais v3 válidas: tenta a chamada complementar", async () => {
    validateTinyEnvMock.mockReturnValue({ ok: true });
    getAttachmentsMock.mockResolvedValueOnce([{ id: "1", url: "https://tiny.com.br/anexo.jpg" }]);
    validateMock.mockResolvedValueOnce([{ url: "https://tiny.com.br/anexo.jpg", accessible: true, status: 200 }]);

    const result = await resolveProductImages("744931523", mappingWith([], "missing"));

    expect(getAttachmentsMock).toHaveBeenCalledWith("744931523");
    expect(result.source).toBe("v3-complementar");
    expect(result.urls).toEqual(["https://tiny.com.br/anexo.jpg"]);
  });

  it("chamada complementar v3 também vazia: nenhuma-fonte, sem inventar imagem", async () => {
    validateTinyEnvMock.mockReturnValue({ ok: true });
    getAttachmentsMock.mockResolvedValueOnce([]);

    const result = await resolveProductImages("123", mappingWith([], "missing"));
    expect(result.source).toBe("nenhuma-fonte");
    expect(result.urls).toEqual([]);
  });

  it("falha na chamada complementar v3 não quebra — devolve nenhuma-fonte com o motivo", async () => {
    validateTinyEnvMock.mockReturnValue({ ok: true });
    getAttachmentsMock.mockRejectedValueOnce(new Error("HTTP 403"));

    const result = await resolveProductImages("123", mappingWith([], "missing"));
    expect(result.source).toBe("nenhuma-fonte");
    expect(result.note).toContain("HTTP 403");
  });
});
