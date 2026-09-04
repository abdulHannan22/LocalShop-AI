export type ShoppingIntent = {
  budget: number | null;
  category: string;
  useCase: string;
  features: string[];
  explanation: string;
  language: string;
};

export type CatalogProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  inventory: number;
  description: string;
  tags: string[];
  accent: string;
  imageUrl?: string | null;
};

export type RankedProduct = CatalogProduct & {
  score: number;
  reasons: string[];
};

export type MatchQuality = "strong" | "weak" | "none";

export const catalog: CatalogProduct[] = [
  {
    id: 1,
    name: "NovaSound Flex",
    category: "Wireless headphones",
    price: 1799,
    rating: 4.7,
    inventory: 18,
    description: "Clear mic, 38-hour battery and a comfortable over-ear fit.",
    tags: ["headphones", "online classes", "wireless", "microphone", "study", "comfort"],
    accent: "lime",
  },
  {
    id: 2,
    name: "ClearCall Lite",
    category: "Wireless headset",
    price: 1299,
    rating: 4.5,
    inventory: 27,
    description: "Lightweight headset with a focused boom microphone.",
    tags: ["headphones", "online classes", "wireless", "microphone", "calls", "lightweight"],
    accent: "blue",
  },
  {
    id: 3,
    name: "StudioMax Air",
    category: "Premium headphones",
    price: 2299,
    rating: 4.8,
    inventory: 8,
    description: "Rich sound, hybrid noise control and all-day cushioning.",
    tags: ["headphones", "music", "wireless", "premium", "noise control", "comfort"],
    accent: "orange",
  },
  {
    id: 4,
    name: "CarryShell Mini",
    category: "Protective case",
    price: 299,
    rating: 4.6,
    inventory: 35,
    description: "Water-resistant hard shell for compact headphones.",
    tags: ["case", "accessory", "travel", "gift"],
    accent: "violet",
  },
  {
    id: 5,
    name: "PocketBeat Go",
    category: "Wireless earbuds",
    price: 1499,
    rating: 4.4,
    inventory: 21,
    description: "Compact earbuds with low-latency audio and a pocket-sized case.",
    tags: ["earbuds", "wireless", "travel", "gaming", "gift", "compact"],
    accent: "violet",
  },
  {
    id: 6,
    name: "StudyBeam Mini",
    category: "Desk lamp",
    price: 999,
    rating: 4.6,
    inventory: 14,
    description: "Eye-comfort LED desk lamp with brightness and colour controls.",
    tags: ["study", "lamp", "desk", "gift", "comfort"],
    accent: "orange",
  },
  {
    id: 7,
    name: "ClickPro Silent",
    category: "Wireless mouse",
    price: 799,
    rating: 4.5,
    inventory: 31,
    description: "Quiet wireless mouse designed for study desks and shared spaces.",
    tags: ["mouse", "wireless", "study", "gift", "quiet"],
    accent: "blue",
  },
  {
    id: 8,
    name: "ChargeNest 20W",
    category: "Fast charger",
    price: 699,
    rating: 4.7,
    inventory: 42,
    description: "Compact USB-C fast charger with temperature protection.",
    tags: ["charger", "travel", "gift", "compact", "accessory"],
    accent: "lime",
  },
];

const knownFeatures = [
  "wireless",
  "microphone",
  "comfort",
  "noise control",
  "lightweight",
  "compact",
  "quiet",
  "fast charging",
];

// Category, use-case and feature terms in Hindi (Devanagari) and common
// Hinglish (Romanized Hindi) spellings, mapped to the same English
// canonical terms used against the catalogue. Keeps the deterministic
// fallback usable for Hindi/Hinglish queries even without Gemini.
const categoryTranslations: Record<string, string> = {
  "हेडफोन": "headphones",
  hedfon: "headphones",
  headfone: "headphones",
  "हेडसेट": "headset",
  "इयरबड्स": "earbuds",
  earbud: "earbuds",
  "माउस": "mouse",
  "लैंप": "lamp",
  "चार्जर": "charger",
  charjar: "charger",
  "केस": "case",
  "कवर": "case",
};

const useCaseTranslations: Record<string, string> = {
  "क्लास": "online classes",
  "पढ़ाई": "study",
  padhai: "study",
  "यात्रा": "travel",
  safar: "travel",
  "सफर": "travel",
  "गेमिंग": "gaming",
  "गाना": "music",
  sangeet: "music",
  "तोहफा": "gift",
  tohfa: "gift",
  "कॉल": "calls",
};

const featureTranslations: Record<string, string> = {
  "वायरलेस": "wireless",
  "माइक": "microphone",
  "हल्का": "lightweight",
  halka: "lightweight",
  "कॉम्पैक्ट": "compact",
};

function detectLanguage(query: string): string {
  if (/[\u0900-\u097F]/.test(query)) return "hi";
  const hinglishMarkers = [
    "hazar",
    "hazaar",
    "rupaye",
    "rupees",
    "chahiye",
    "ke liye",
    "ke andar",
    "tak chahiye",
    "sasta",
    "accha",
    "wala",
  ];
  const normalized = query.toLowerCase();
  return hinglishMarkers.some((marker) => normalized.includes(marker)) ? "hinglish" : "en";
}

function translateTerm(normalized: string, dictionary: Record<string, string>): string | null {
  for (const [source, target] of Object.entries(dictionary)) {
    if (normalized.includes(source.toLowerCase())) return target;
  }
  return null;
}

export function extractIntentWithRules(query: string): ShoppingIntent {
  const normalized = query.toLowerCase();
  const language = detectLanguage(query);

  const budgetMatch = normalized.match(
    /(?:under|below|within|up to|max(?:imum)?)\s*₹?\s*([\d,]+)/i,
  );
  // Hinglish/Hindi budget phrasing: "2 hazar tak", "1500 ke andar",
  // "1500 रुपये के अंदर", "2000 तक" etc.
  const hazarMatch = normalized.match(/([\d,]+)\s*(?:hazar|hazaar)\b/i);
  const hindiBudgetMarkers = ["ke andar", "के अंदर", "तक", "se kam", "ke niche", "ke under"];
  const hasHindiBudgetMarker = hindiBudgetMarkers.some((marker) => normalized.includes(marker));
  const firstNumberMatch = normalized.match(/([\d,]{2,})/);
  const budget = budgetMatch
    ? Number(budgetMatch[1].replace(/,/g, ""))
    : hazarMatch
      ? Number(hazarMatch[1].replace(/,/g, "")) * 1000
      : hasHindiBudgetMarker && firstNumberMatch
        ? Number(firstNumberMatch[1].replace(/,/g, ""))
        : null;

  const useCase =
    [
      "online classes",
      "daily travel",
      "travel",
      "gaming",
      "music",
      "study",
      "gift",
      "calls",
    ].find((value) => normalized.includes(value)) ??
    translateTerm(normalized, useCaseTranslations) ??
    "general use";

  const category =
    [
      "headphones",
      "headset",
      "earbuds",
      "mouse",
      "lamp",
      "charger",
      "case",
    ].find((value) => normalized.includes(value)) ??
    translateTerm(normalized, categoryTranslations) ??
    "technology accessory";

  const features = knownFeatures.filter((feature) =>
    normalized.includes(feature),
  );
  const translatedFeature = translateTerm(normalized, featureTranslations);
  if (translatedFeature && !features.includes(translatedFeature)) {
    features.push(translatedFeature);
  }

  if ((normalized.includes("class") || normalized.includes("क्लास")) && !features.includes("microphone")) {
    features.push("microphone");
  }
  if ((normalized.includes("travel") || normalized.includes("यात्रा") || normalized.includes("safar")) && !features.includes("compact")) {
    features.push("compact");
  }

  return {
    budget,
    category,
    useCase,
    features,
    explanation: `Prioritised ${category}, ${useCase}, ${
      features.length ? features.join(", ") : "reliable everyday use"
    }${budget ? `, and a budget of ₹${budget.toLocaleString("en-IN")}` : ""}.`,
    language,
  };
}

export function rankProducts(
  intent: ShoppingIntent,
  source: CatalogProduct[] = catalog,
): RankedProduct[] {
  const categoryTokens = intent.category.toLowerCase().split(/\s+/);
  const useCase = intent.useCase.toLowerCase();

  return source
    .filter((product) => product.inventory > 0)
    .map((product) => {
      // Include the product name itself, not just category/tags — a query
      // for "moong dal" should match a product literally named "Moong Dal
      // 1kg" even if its category/tags use a different word (e.g. "Pulses").
      const haystack = `${product.name} ${product.category} ${product.tags.join(" ")}`.toLowerCase();
      const reasons: string[] = [];
      let score = product.rating * 6;

      if (intent.budget && product.price <= intent.budget) {
        score += 34;
        reasons.push("Within budget");
      } else if (intent.budget && product.price > intent.budget) {
        score -= Math.min(30, ((product.price - intent.budget) / intent.budget) * 50);
      }

      // Whole-phrase match first (handles multi-word categories exactly),
      // then fall back to individual tokens of at least 3 characters so
      // short-but-meaningful words like "dal", "oil", "tea" aren't dropped.
      const categoryPhrase = intent.category.toLowerCase().trim();
      const categoryMatched =
        (categoryPhrase.length > 2 && haystack.includes(categoryPhrase)) ||
        categoryTokens.some((token) => token.length >= 3 && haystack.includes(token));
      if (categoryMatched) {
        score += 24;
        reasons.push("Category match");
      }

      if (useCase !== "general use" && haystack.includes(useCase)) {
        score += 18;
        reasons.push(`Good for ${intent.useCase}`);
      }

      const featureMatches = intent.features.filter((feature) =>
        haystack.includes(feature.toLowerCase()),
      );
      score += featureMatches.length * 12;
      if (featureMatches.length) {
        reasons.push(featureMatches.slice(0, 2).join(" + "));
      }

      if (!reasons.length) reasons.push("Strong rating", "Available now");

      return {
        ...product,
        score: Math.max(0, Math.round(score)),
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function getProduct(productId: number) {
  return catalog.find((product) => product.id === productId) ?? null;
}

/**
 * Judges how confident a set of ranked products actually is, rather than
 * always presenting the top 3 as if they were a strong match. A product
 * only counts as real signal if it matched on something beyond the
 * baseline rating (budget, category, use case, or a stated feature).
 */
export function assessMatchQuality(products: RankedProduct[]): MatchQuality {
  if (!products.length) return "none";
  const genericOnly = (reasons: string[]) =>
    reasons.every((reason) => reason === "Strong rating" || reason === "Available now");

  const top = products[0];
  if (genericOnly(top.reasons)) return "none";
  return top.score >= 50 ? "strong" : "weak";
}