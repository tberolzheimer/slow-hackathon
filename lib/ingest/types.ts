export interface DiscoveredPost {
  url: string
  slug: string
  lastmod?: string
}

export interface ParsedPost {
  title: string
  slug: string
  url: string
  date: Date
  outfitImageUrl: string | null
  products: ParsedProduct[]
  rawHtml: string
  wpPostId: number | null
  categories: string[]
}

export interface ParsedProduct {
  rawText: string
  brand: string | null
  itemName: string | null
  affiliateUrl: string
  productImageUrl: string | null
  sortOrder: number
  isAlternative: boolean
}

export interface GridProduct {
  affiliateUrl: string
  imageUrl: string
}

export interface TextProduct {
  rawText: string
  affiliateUrl: string
  isAlternative: boolean
}
