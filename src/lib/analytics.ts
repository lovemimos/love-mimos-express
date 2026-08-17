/**
 * Analytics scaffolding — no real provider (GA/Segment/etc.) wired up
 * yet. This exists so every meaningful interaction already calls a
 * single, typed function; plugging in a real analytics provider later
 * is a one-function change here, not a hunt through every component
 * that should report an event.
 *
 * Deliberately logs to the console only in development — never sends
 * anything anywhere. See docs/ROADMAP.md for when real integration is
 * planned.
 */
export type AnalyticsEvent =
  | { name: "banner_click"; bannerId: string }
  | { name: "category_click"; categorySlug: string }
  | { name: "favorite_click"; productId: string; action: "add" | "remove" }
  | { name: "product_click"; productId: string; source: string }
  | { name: "recommendation_view"; strategy: string; source: string; count: number }
  | { name: "recommendation_click"; strategy: string; source: string; productId: string }
  // Definidos por estrutura (Sprint 10 task 11), mas nunca disparados
  // hoje: emiti-los exigiria tocar em componentes de Carrinho/Favoritos,
  // o que as regras desta sprint proíbem explicitamente. Ficam prontos
  // para quando uma ação de "adicionar ao carrinho"/"favoritar" for
  // adicionada diretamente a um card de recomendação.
  | { name: "recommendation_add_to_cart"; strategy: string; source: string; productId: string }
  | { name: "recommendation_favorite"; strategy: string; source: string; productId: string };

export function trackEvent(event: AnalyticsEvent): void {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", event);
  }
}
