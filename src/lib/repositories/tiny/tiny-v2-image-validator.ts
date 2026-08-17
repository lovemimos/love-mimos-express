import "server-only";

export type ImageUrlValidation = {
  url: string;
  accessible: boolean;
  status?: number;
  contentType?: string;
  error?: string;
};

/**
 * Faz uma requisição real, sem nenhuma credencial, para confirmar que
 * a URL de imagem é pública e acessível. Usa HEAD primeiro (mais
 * barato); se o servidor não suportar HEAD, cai para GET. Nunca envia
 * nenhum header de autenticação da Tiny — se a URL exigir login, isso
 * aparece como `accessible: false`.
 */
export async function validateImageUrl(url: string): Promise<ImageUrlValidation> {
  try {
    let response = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, { method: "GET", cache: "no-store" });
    }
    return {
      url,
      accessible: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type") ?? undefined,
    };
  } catch (err) {
    return { url, accessible: false, error: err instanceof Error ? err.message : "Erro de rede desconhecido" };
  }
}

export async function validateImageUrls(urls: string[]): Promise<ImageUrlValidation[]> {
  return Promise.all(urls.map(validateImageUrl));
}
