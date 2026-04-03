import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

export interface VisionAnalysis {
  garments: {
    type: string
    colorHex: string
    colorName: string
    fabric: string
    pattern: string
    silhouette: string
  }[]
  palette: string[] // hex colors
  mood: string
  season: string
  formality: string
  setting: string
  vibeKeywords: string[]
  stylingNotes: string
  productMatches: {
    garmentIndex: number
    productName: string
    confidence: number
  }[]
}

/**
 * Analyze a single outfit photo with Claude Sonnet vision.
 * Returns structured data about garments, palette, mood, and styling.
 */
export async function analyzeOutfitImage(
  imageUrl: string,
  productNames: string[]
): Promise<VisionAnalysis> {
  const productContext =
    productNames.length > 0
      ? `\n\nThe following products are listed with this outfit:\n${productNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}`
      : ""

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
          {
            type: "text",
            text: `You are analyzing outfit photos for VibéShop, a styling destination by Julia Berolzheimer. Analyze this outfit photo and return a JSON object with the following structure. Be specific and descriptive — your analysis powers search, clustering, and styling content.
${productContext}

Return ONLY valid JSON with this exact structure:
{
  "garments": [
    {
      "type": "midi dress",
      "colorHex": "#E8D5C4",
      "colorName": "champagne",
      "fabric": "silk",
      "pattern": "solid",
      "silhouette": "A-line"
    }
  ],
  "palette": ["#E8D5C4", "#FFFFFF", "#2C1810"],
  "mood": "romantic",
  "season": "spring",
  "formality": "smart-casual",
  "setting": "garden",
  "vibeKeywords": ["romantic", "garden-party", "soft-palette", "feminine", "springtime", "floral-adjacent", "elegant", "whimsical", "layered", "effortless"],
  "stylingNotes": "A champagne silk midi dress paired with delicate gold jewelry creates an effortlessly romantic look perfect for outdoor spring events. The trick is letting the fabric do the work — no over-accessorizing needed.",
  "productMatches": [
    { "garmentIndex": 0, "productName": "Dress Name", "confidence": 0.9 }
  ]
}

Guidelines:
- List ALL visible garments (clothing, shoes, bags, jewelry, accessories)
- palette: 3-5 dominant colors from the overall image (outfit + setting)
- mood: one word (romantic, minimalist, preppy, edgy, bohemian, polished, playful, etc.)
- season: spring, summer, fall, or winter
- formality: casual, smart-casual, polished, or evening
- setting: where the photo appears to be taken (street, garden, beach, indoor, urban, travel, studio, etc.)
- vibeKeywords: 8-12 words that capture the aesthetic AND the identity. Mix garment descriptors with feeling words. Think about who this woman is and how she wants to feel. Examples: "confident-ease", "garden-romantic", "knows-her-power", "weekend-luxe", "effortless-polish". These power search and clustering.
- stylingNotes: 1-2 sentences written as a style guide talking to a friend. Frame it as advice that helps someone recreate this look and understand WHY it works — not just what the items are. Speak to the woman who wants to dress this way but doesn't know how. Example: "The trick here is pairing the volume of the wide-leg with a cropped knit — it keeps the proportions clean without looking overdone."
- productMatches: Match visible garments to the product list by name. confidence 0-1.`,
          },
        ],
      },
    ],
  })

  // Extract text content from response
  const textBlock = response.content.find((b) => b.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude")
  }

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = textBlock.text.trim()
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  try {
    return JSON.parse(jsonStr) as VisionAnalysis
  } catch (err) {
    throw new Error(`Failed to parse vision response as JSON: ${err}\nRaw: ${jsonStr.slice(0, 200)}`)
  }
}
