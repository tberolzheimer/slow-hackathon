/**
 * Fix truncated brand names in the database.
 *
 * Uses batch updateMany calls grouped by rawText to avoid slow individual updates.
 * Also handles typos/misspellings in the original post data.
 *
 * Usage: npx tsx scripts/fix-truncated-brands.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// ─── Direct rawText -> (brand, itemName) overrides for typos/misspellings ───
const RAWTEXT_OVERRIDES: Record<string, { brand: string | null; itemName: string | null }> = {
  "Bottega Venetta Skirt": { brand: "Bottega Veneta", itemName: "Skirt" },
  "Saint Lauren Sunglasses": { brand: "Saint Laurent", itemName: "Sunglasses" },
  "Sherman Field Necklace": { brand: "Sherman Fields", itemName: "Necklace" },
  "Sherman Field Necklaces": { brand: "Sherman Fields", itemName: "Necklaces" },
  "Sherman Field": { brand: "Sherman Fields", itemName: null },
  "Janessa Leon Hat": { brand: "Janessa Leone", itemName: "Hat" },
  "Emporio Sirense Dress": { brand: "Emporio Sirenuse", itemName: "Dress" },
  "Emporior Sirenuse Skirt": { brand: "Emporio Sirenuse", itemName: "Skirt" },
  "Gianvitto Rossi Heels": { brand: "Gianvito Rossi", itemName: "Heels" },
  "Gianvitto Rossi Sandals": { brand: "Gianvito Rossi", itemName: "Sandals" },
  "Gianvitto Rossi Flats": { brand: "Gianvito Rossi", itemName: "Flats" },
  "Gianvitto Rossi Pumps": { brand: "Gianvito Rossi", itemName: "Pumps" },
  "Gigi Buris Hat": { brand: "Gigi Burris", itemName: "Hat" },
  "Altuzzura Coat": { brand: "Altuzarra", itemName: "Coat" },
  "Altuzzura Dress": { brand: "Altuzarra", itemName: "Dress" },
  "Altuzzura Jacket": { brand: "Altuzarra", itemName: "Jacket" },
  "Altuzzura Skirt": { brand: "Altuzarra", itemName: "Skirt" },
  "Altuzzara Dress": { brand: "Altuzarra", itemName: "Dress" },
  "Altuzurra Dress": { brand: "Altuzarra", itemName: "Dress" },
  "Atersee Bag": { brand: "Attersee", itemName: "Bag" },
  "Simkai Top": { brand: "Simkhai", itemName: "Top" },
}

// ─── Extended KNOWN_BRANDS for re-parsing ───
const KNOWN_BRANDS = [
  // 5+ word brands
  "Thank You Have A Good Day",
  "Call It By Your Name",
  "Call Me By Your Name",
  "Show Me Your Mumu",
  "A Piece A Part",
  "The Line by K",
  // 4 word brands
  "Christopher John Rogers",
  "Oscar de la Renta",
  "Jacques Marie Mage",
  "Pierre Louis Mascia",
  "Citizens of Humanity",
  "Alix of Bohemia",
  "For Restless Sleepers",
  "By Malene Birger",
  "House of Dagmar",
  "Lisa Marie Fernandez",
  "Rebecca de Ravenel",
  "LouLou de Saison",
  "Le Monde Beryl",
  "Le Sun Dial",
  "Perfect White Tee",
  "Cap D'Antibes",
  // 3 word brands
  "Hunting Season",
  "Guest in Residence",
  "Guest In Residence",
  "Wardrobe NYC",
  "& Other Stories",
  "JB x Margaux",
  "JB x JB",
  "Victoria Beckham",
  "Jil Sander",
  "Rosie Assoulin",
  "Lela Rose",
  "Arielle Ratner",
  "Carolina Herrera",
  "Carolina Bucci",
  "Carolina K",
  "Ulla Johnson",
  "Veronica Beard",
  "Simone Rocha",
  "Simone Perele",
  "Tory Burch",
  "Rachel Comey",
  "Mansur Gavriel",
  "Isabel Marant",
  "Jenni Kayne",
  "Banana Republic",
  "Nili Lotan",
  "Gianvito Rossi",
  "Manolo Blahnik",
  "Dries Van Noten",
  "Saint Laurent",
  "Emporio Armani",
  "Emporio Sirenuse",
  "Jimmy Choo",
  "Jimmy Fairly",
  "Loeffler Randall",
  "Loro Piana",
  "Irene Neuwirth",
  "Sherman Fields",
  "Janessa Leone",
  "Wiggy Kit",
  "Another Tomorrow",
  "Acne Studios",
  "Rag & Bone",
  "Cult Gaia",
  "Lisa Corti",
  "Lisa Yang",
  "La DoubleJ",
  "La Coqueta",
  "La Vesta",
  "La Veste",
  "La Ligne",
  "Le Specs",
  "Le Sirenuse",
  "Le Kasha",
  "Le Sundial",
  "Le Bop",
  "Sea New York",
  "Sea NY",
  "Jenna Blake",
  "Zoe Chicco",
  "Nour Hammour",
  "Emme Parsons",
  "Chan Luu",
  "High Sport",
  "Cinq a Sept",
  "Cinq A Sept",
  "Gigi Burris",
  "Ciao Lucia",
  "Christopher Esber",
  "Dolce & Gabbana",
  "Dolce Vita",
  "Brunello Cucinelli",
  "Proenza Schouler",
  "Roger Vivier",
  "Stella McCartney",
  "Stella Kids",
  "Bottega Veneta",
  "Miu Miu",
  "Free People",
  "Max Mara",
  "Johanna Ortiz",
  "Suzie Kondi",
  "Simon Miller",
  "Adam Lippes",
  "Magda Butrym",
  "Guiliva Heritage",
  "Giuliva Heritage",
  "Anine Bing",
  "Apiece Apart",
  "Tanya Taylor",
  "Blaze Milano",
  "Vanessa Bruno",
  "Rosetta Getty",
  "Simonetta Ravizza",
  "Thierry Colson",
  "Marrakshi Life",
  "Sensi Studio",
  "Zeus + Dione",
  "Zeus + Dion",
  "Loretta Caponi",
  "Maygel Coronel",
  "Tiny Gods",
  "Seaman Schepps",
  "Louis Abel",
  "Emilia Wickstead",
  "Elder Statesman",
  "Marissa Klass",
  "Massimo Dutti",
  "Cami NYC",
  "Me + Em",
  "Follow Suit",
  "De Castro",
  "B Sides",
  "Still Here",
  "Maison Marigold",
  "LouLou LaDune",
  "Clare V.",
  "Clare V",
  "Coco Shop",
  "Comme Si",
  "The Row",
  "The Great",
  "The RealReal",
  "The Upside",
  "The Wolf Gang",
  "The Garment",
  // Single-word brands (unambiguous)
  "Chanel",
  "Hermes",
  "Gucci",
  "Prada",
  "Dior",
  "Celine",
  "Fendi",
  "Loewe",
  "Valentino",
  "Ferragamo",
  "Missoni",
  "Etro",
  "Pucci",
  "Zimmermann",
  "Altuzarra",
  "Alaia",
  "Khaite",
  "Staud",
  "Doen",
  "Attersee",
  "Toteme",
  "Aquazzura",
  "Savette",
  "Delvaux",
  "Leset",
  "Sezane",
  "Destree",
  "Alemais",
  "Merlette",
  "Soeur",
  "Amanu",
  "Varley",
  "Aligne",
  "Frame",
  "Reformation",
  "Tuckernuck",
  "Mother",
  "Metier",
  "Margaux",
  "J.Crew",
  "Mango",
  "Zara",
  "H&M",
  "Gap",
  "Everlane",
  "COS",
  "Adidas",
  "Nike",
  "Amazon",
  "Levi's",
  "Faithfull",
  "Commando",
  "Courreges",
  "Cordera",
  "Couper",
  "CocoShop",
  "Co",
  "Rohe",
  "Tove",
  "Eddy",
  "Rocio",
  "Eterne",
  "LilyEve",
  "Lowercase",
  "Goop",
  "Chloe",
  "Clergerie",
  "Sir",
  "Ossa",
  "Acne",
  "Vintage",
]

// Junk "brands" that are parse artifacts — null these out
const JUNK_BRANDS = new Set([
  "here", "here,", "Here",
  "Similar", "similar",
  "this",
  "Outfit",
  "Top", "Pants", "Sweater", "Dress", "Vest", "Sunglasses", "Boots", "Jeans", "Tee",
  "white", "purple",
  "sold", "on", "90",
])

function parseBrandItem(rawText: string): { brand: string | null; itemName: string | null } {
  if (!rawText) return { brand: null, itemName: null }

  const text = rawText.trim()

  // Check overrides first (for typos)
  if (RAWTEXT_OVERRIDES[text]) {
    return RAWTEXT_OVERRIDES[text]
  }

  // Try known brands (longest first to match multi-word brands)
  const sorted = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length)
  for (const brand of sorted) {
    if (text.toLowerCase().startsWith(brand.toLowerCase())) {
      const rest = text.slice(brand.length).trim()
      return { brand, itemName: rest || null }
    }
  }

  // Fallback: first word is brand, rest is item
  const spaceIdx = text.indexOf(" ")
  if (spaceIdx > 0) {
    const brand = text.slice(0, spaceIdx)
    const itemName = text.slice(spaceIdx + 1)
    // If fallback brand is junk, null it
    if (JUNK_BRANDS.has(brand)) {
      return { brand: null, itemName: null }
    }
    return { brand, itemName }
  }

  // Single word — if it's junk, null it
  if (JUNK_BRANDS.has(text)) {
    return { brand: null, itemName: null }
  }

  return { brand: text, itemName: null }
}

async function main() {
  console.log("=== Fix Truncated Brands ===\n")

  // Step 1: Re-parse ALL products from rawText (batch mode)
  console.log("--- Step 1: Re-parse brands from rawText (batch mode) ---")

  const allProducts = await prisma.product.findMany({
    where: { rawText: { not: "" } },
    select: { id: true, brand: true, itemName: true, rawText: true },
  })

  console.log(`  Found ${allProducts.length} products to check`)

  // Group by rawText to batch updates
  const byRawText = new Map<string, typeof allProducts>()
  for (const p of allProducts) {
    const existing = byRawText.get(p.rawText) || []
    existing.push(p)
    byRawText.set(p.rawText, existing)
  }

  let totalUpdated = 0
  let totalSkipped = 0
  const changeSummary: Record<string, number> = {}

  for (const [rawText, products] of byRawText) {
    const { brand: newBrand, itemName: newItemName } = parseBrandItem(rawText)
    const sample = products[0]

    if (newBrand !== sample.brand || newItemName !== sample.itemName) {
      const ids = products.map(p => p.id)
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { brand: newBrand, itemName: newItemName },
      })

      const oldBrand = sample.brand ?? "null"
      const newBrandStr = newBrand ?? "null"
      const key = `"${oldBrand}" -> "${newBrandStr}"`
      changeSummary[key] = (changeSummary[key] || 0) + products.length
      totalUpdated += products.length
    } else {
      totalSkipped += products.length
    }
  }

  console.log(`  Updated: ${totalUpdated}`)
  console.log(`  Unchanged: ${totalSkipped}`)

  console.log("\n--- Change Summary ---")
  const sortedChanges = Object.entries(changeSummary).sort((a, b) => b[1] - a[1])
  for (const [change, count] of sortedChanges) {
    console.log(`  ${change}: ${count} products`)
  }

  // Step 2: Verify — the core truncated brands should all be 0
  console.log("\n--- Verification: originally truncated brands ---")
  const coreProblemBrands = [
    "Bottega", "Saint", "Le", "here", "Here", "here,", "Similar", "similar",
  ]
  let allClear = true
  for (const b of coreProblemBrands) {
    const count = await prisma.product.count({ where: { brand: b } })
    if (count > 0) {
      console.log(`  FAIL: "${b}" still has ${count} products`)
      allClear = false
    } else {
      console.log(`  OK: "${b}" = 0`)
    }
  }

  // Also check all formerly-truncated multi-word brands
  console.log("\n--- Verification: other truncated brands ---")
  const otherProblemBrands = [
    "Sherman", "Janessa", "Christopher", "Jimmy", "Loro", "Dries",
    "Irene", "Emporio", "Max", "Manolo", "Loeffler", "Hunting",
    "Nili", "Citizens", "La", "Gianvito", "Wardrobe",
    "Wiggy", "Chan", "Ciao", "Cult", "Rag", "Guest", "High",
    "Free", "Nour", "Zoe", "Emme", "Dolce", "Brunello", "Proenza",
    "The",
  ]
  for (const b of otherProblemBrands) {
    const count = await prisma.product.count({ where: { brand: b } })
    if (count > 0) {
      console.log(`  FAIL: "${b}" still has ${count} products`)
      allClear = false
    } else {
      console.log(`  OK: "${b}" = 0`)
    }
  }

  // Check junk brands are gone
  console.log("\n--- Verification: junk brands ---")
  for (const b of JUNK_BRANDS) {
    const count = await prisma.product.count({ where: { brand: b } })
    if (count > 0) {
      console.log(`  FAIL: "${b}" still has ${count} products`)
      allClear = false
    }
  }

  if (allClear) {
    console.log("  ALL CLEAR: No truncated or junk brands remain!")
  }

  // Show top 50 brands after fix
  console.log("\n--- Top 50 brands after fix ---")
  const topBrands = await prisma.product.groupBy({
    by: ["brand"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 50,
  })
  for (const b of topBrands) {
    console.log(`  ${b.brand ?? "(null)"}: ${b._count.id}`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
