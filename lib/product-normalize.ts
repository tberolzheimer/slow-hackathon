// ---------------------------------------------------------------------------
// Shared product normalization logic
// Used by most-worn page and product/[slug] page to group the same product
// across different URLs and name variants (e.g. "Ballet Flats" -> "Flats").
// ---------------------------------------------------------------------------

/**
 * Canonical garment-type mappings.
 * Order matters: longer phrases must come before shorter ones so that
 * "ballet flats" is matched before "flats".
 */
const GARMENT_SYNONYMS: [RegExp, string][] = [
  // Shoes
  [/\bballet flats?\b/gi, "flats"],
  // Dresses
  [/\bmidi dress(es)?\b/gi, "dress"],
  [/\bmaxi dress(es)?\b/gi, "dress"],
  [/\bwrap dress(es)?\b/gi, "dress"],
  [/\bmini dress(es)?\b/gi, "dress"],
  [/\bshirt dress(es)?\b/gi, "dress"],
  // Skirts
  [/\bmidi skirts?\b/gi, "skirt"],
  [/\bmaxi skirts?\b/gi, "skirt"],
  [/\bmini skirts?\b/gi, "skirt"],
  // Pants / jeans
  [/\bwide[- ]leg pants\b/gi, "pants"],
  [/\bwide[- ]leg jeans\b/gi, "jeans"],
  [/\bstraight[- ]leg jeans\b/gi, "jeans"],
  // Hats
  [/\bsun hats?\b/gi, "hat"],
  [/\bbucket hats?\b/gi, "hat"],
  [/\bstraw hats?\b/gi, "hat"],
  // Bags
  [/\btote bags?\b/gi, "bag"],
  [/\bcrossbody bags?\b/gi, "bag"],
  [/\bshoulder bags?\b/gi, "bag"],
  [/\bclutch bags?\b/gi, "bag"],
  // Earrings
  [/\bdrop earrings?\b/gi, "earrings"],
  [/\bhoop earrings?\b/gi, "earrings"],
  [/\bstud earrings?\b/gi, "earrings"],
  // Shirts / tops
  [/\bbutton[- ]up shirts?\b/gi, "shirt"],
  [/\bbutton[- ]down shirts?\b/gi, "shirt"],
  [/\btank tops?\b/gi, "top"],
  [/\bcrop tops?\b/gi, "top"],
  [/\bsleeveless tops?\b/gi, "top"],
]

/**
 * Collapse a raw item name into a canonical, minimal form:
 *   "Black Leather Ballet Flats" -> "flats"
 *   "Midi Dress"                 -> "dress"
 *   "Canvas Tote Bag"            -> "bag"
 *
 * Steps:
 *  1. Lower-case + trim
 *  2. Replace garment synonym phrases with their canonical forms
 *  3. Strip colour, material, and size/fit modifiers
 *  4. Collapse whitespace
 */
export function normalizeItemName(raw: string | null): string {
  if (!raw) return "item"
  let item = raw.toLowerCase().trim()

  // 1. Apply canonical garment synonyms (longest-match-first)
  for (const [pattern, replacement] of GARMENT_SYNONYMS) {
    item = item.replace(pattern, replacement)
  }

  // 2. Strip colour words
  item = item.replace(
    /\b(black|white|beige|tan|brown|navy|cream|nude|gold|silver|pink|blue|red|green|gray|grey|ivory|camel|taupe|olive|burgundy|blush|coral|rust|charcoal|ecru|khaki|lavender|mustard|peach|plum|sage|terracotta|wine)\b/g,
    ""
  )

  // 3. Strip material/fabric words
  item = item.replace(
    /\b(leather|suede|canvas|satin|silk|patent|velvet|wool|cashmere|cotton|linen|denim|tweed|chiffon|crepe|crochet|knit|woven|raffia|straw|nylon|mesh|sequin|embroidered|quilted|pleated)\b/g,
    ""
  )

  // 4. Strip size/fit modifiers
  item = item.replace(
    /\b(mini|small|medium|large|oversized|slim|relaxed|fitted|petite|tall|cropped|long|short|high[- ]rise|low[- ]rise|mid[- ]rise)\b/g,
    ""
  )

  // 5. Collapse whitespace
  item = item.replace(/\s+/g, " ").trim()

  return item || "item"
}

/**
 * Build a grouping key from brand + item name.
 * Returns null when brand is missing (ungroupable).
 *
 * Example: ("Chanel", "Ballet Flats") -> "chanel|flats"
 *          ("Chanel", "Flats")        -> "chanel|flats"
 */
export function normalizeItemKey(
  brand: string | null,
  itemName: string | null
): string | null {
  if (!brand) return null
  const b = brand.toLowerCase().trim()
  const item = normalizeItemName(itemName)
  return `${b}|${item}`
}

/**
 * Generate a URL slug from brand + item name using the same normalization.
 * Example: ("Chanel", "Ballet Flats") -> "chanel-flats"
 */
export function productSlug(
  brand: string | null,
  itemName: string | null
): string {
  const b = (brand || "").toLowerCase().trim()
  const item = normalizeItemName(itemName)
  return [b, item]
    .filter(Boolean)
    .join(" ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
