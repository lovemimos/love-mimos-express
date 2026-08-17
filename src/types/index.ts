/**
 * Domain types for Love Mimos Express.
 *
 * These are intentionally shaped so that swapping the mock data source
 * (lib/data/products.ts) for a real integration (e.g. Tiny ERP API) only
 * requires writing an adapter that maps the external payload to this
 * shape — nothing in the UI layer should need to change.
 */

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string; // lucide-react icon name, resolved in components/ui/CategoryIcon.tsx
};

/**
 * A brand as a first-class entity — not just a string on `Product`.
 * Elevated to its own type (Sprint: Catálogo Facetado, domain
 * consolidation) specifically because Marca needs more than a filter
 * value: a brand page, a brand banner, a brand description, and its own
 * SEO — none of which the other facets (técnica, efeito, curvatura...)
 * need. That's the entire reason Brand gets this treatment and the rest
 * stay as plain `attributes` — see docs/features/faceted-catalog.md.
 */
export type Brand = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  bannerImage?: string;
  seoTitle?: string;
  seoDescription?: string;
};

/**
 * Reference back to the record in whatever external system a product
 * (or variant) was synced from — e.g. `{ source: "tiny", id: "12345" }`.
 * Deliberately generic (not `tinyId`): the domain doesn't know or care
 * which source it came from, only that *some* source has an ID for it,
 * so a future sync can find "this same thing" again instead of
 * creating a duplicate. See docs/features/tiny-single-product-sync.md.
 */
export type ExternalRef = {
  source: string; // e.g. "tiny", "nuvemshop"
  id: string;
};

export type ProductVariant = {
  id: string;
  label: string; // e.g. "Volume Russo 0.07 D", "Curvatura C"
  priceModifier?: number; // added to base price, defaults to 0
  externalRef?: ExternalRef;
  /**
   * When the variation dimension itself IS a facet (most commonly
   * "Cor" — a product genuinely available in several real colors), the
   * per-variant value lives here rather than being forced into a single
   * value on `Product.attributes` (which would misrepresent every color
   * but one). Facet-aware filtering considers both the product's own
   * `attributes` and every variant's `attributes` — see
   * `src/lib/repositories/product-query.ts`.
   */
  attributes?: Record<string, string>;
};

export type Product = {
  id: string; // maps to Tiny "codigo"/id in a future integration
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number; // current price, in BRL
  compareAtPrice?: number; // original price, if on promotion
  stock: number;

  // Identidade/estoque — campos singulares, nunca "navegáveis" (não é o
  // tipo de coisa que alguém filtra a vitrine por). Mapeiam 1:1 com a
  // Tiny quando essa integração existir — ver docs/API_TINY.md.
  sku?: string; // maps to Tiny "codigo" (SKU) explicitly
  barcode?: string; // Código de barras — maps to Tiny "codigo de barras"
  manufacturer?: string; // Fabricante — a empresa que produz fisicamente o item, distinto da marca comercial (ver `brandSlug`)
  weight?: number; // kg — nome de campo na Tiny ainda não confirmado, ver docs/features/tiny-single-product-sync.md
  dimensions?: { height: number; width: number; length: number }; // cm — idem
  unit?: string; // unidade de medida/venda — ex.: "UN", "CX", "KG"
  ncm?: string; // Nomenclatura Comum do Mercosul — classificação fiscal brasileira
  externalRef?: ExternalRef; // ver definição de ExternalRef acima

  // Categoria Principal — o menu simples e fixo (7 itens,
  // src/lib/data/categories.ts). Não existe mais Categoria → Subcategoria
  // no domínio; qualquer hierarquia de uma fonte externa é traduzida
  // para categorySlug + attributes na camada de importação daquela
  // fonte, nunca representada aqui.
  categorySlug: string;

  // Marca — referência para a entidade `Brand` (src/lib/data/brands.ts).
  // Opcional: nem todo produto tem marca conhecida.
  brandSlug?: string;

  /**
   * Facetas de navegação abertas e extensíveis — linha, técnica,
   * efeito, curvatura, espessura, comprimento, cor, material, volume.
   * Um produto pertence a quantos grupos fizer sentido simultaneamente,
   * sem duplicação, porque é só um dicionário chave/valor no mesmo
   * registro. Nova faceta = uma linha em
   * `src/lib/facets/registry.ts`, nunca uma mudança aqui. Marca
   * deliberadamente NÃO mora aqui — ver `Brand`/`brandSlug` acima.
   */
  attributes?: Record<string, string>;

  /** Palavras-chave livres — não são "chave:valor" como as facetas
   * acima, então vivem em uma lista à parte, não dentro de `attributes`. */
  tags?: string[];

  images: string[]; // placeholder gradient ids for now, real URLs later
  badge?: "novo" | "mais-vendido" | "promocao";
  rating?: number; // 0-5
  reviewCount?: number;
  variants?: ProductVariant[];
};

/**
 * A favorited product. Deliberately product-level only (no `variantId`)
 * — unlike the cart, favoriting is "I like this item", not "I want this
 * specific curvature/size right now" — matching how wishlists work in
 * most e-commerce apps. `addedAt` isn't shown in the UI today, but
 * enables recency-based sorting/recommendations later without a schema
 * change — see docs/features/favorites.md.
 */
export type FavoriteEntry = {
  productId: string;
  addedAt: string; // ISO timestamp
};

/**
 * A hero banner slot on the Home screen. Deliberately its own type (not
 * hardcoded JSX) so a future admin panel (see docs/ADMIN_PANEL.md) can
 * manage banners as data — today there's a single mock banner in
 * `src/lib/data/banners.ts`; `HomeHero` already supports rendering more
 * than one (as a carousel) without any change to this contract.
 */
export type HeroBanner = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
  theme: "dark" | "light"; // same theme vocabulary as BrandLogo — dark bg+light text, or the reverse
};

export type CartLine = {
  productId: string;
  variantId?: string;
  quantity: number;
};

export type CartLineWithProduct = CartLine & {
  product: Product;
  variant?: ProductVariant;
  lineTotal: number;
};

/**
 * Aggregate cart snapshot: resolved lines + derived totals. This is the
 * shape the UI actually consumes (via useCartLines) — CartLine only
 * holds IDs, Cart is what you get after resolving those IDs against the
 * catalog and computing totals. See src/services/cart-service.ts.
 */
export type Cart = {
  lines: CartLineWithProduct[];
  subtotal: number;
  itemCount: number;
};
