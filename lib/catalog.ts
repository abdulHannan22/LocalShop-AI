export type ShoppingIntent = {
  budget: number | null;
  category: string;
  useCase: string;
  features: string[];
  explanation: string;
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
};

export type RankedProduct = CatalogProduct & {
  score: number;
  reasons: string[];
};

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

export function extractIntentWithRules(query: string): ShoppingIntent {
  const normalized = query.toLowerCase();
  const budgetMatch = normalized.match(
    /(?:under|below|within|up to|max(?:imum)?)\s*₹?\s*([\d,]+)/i,
  );
  const budget = budgetMatch
    ? Number(budgetMatch[1].replace(/,/g, ""))
    : null;

  const useCase = [
    "online classes",
    "daily travel",
    "travel",
    "gaming",
    "music",
    "study",
    "gift",
    "calls",
  ].find((value) => normalized.includes(value)) ?? "general use";

  const category = [
    "headphones",
    "headset",
    "earbuds",
    "mouse",
    "lamp",
    "charger",
    "case",
  ].find((value) => normalized.includes(value)) ?? "technology accessory";

  const features = knownFeatures.filter((feature) =>
    normalized.includes(feature),
  );

  if (normalized.includes("class") && !features.includes("microphone")) {
    features.push("microphone");
  }
  if (normalized.includes("travel") && !features.includes("compact")) {
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
      const haystack = `${product.category} ${product.tags.join(" ")}`.toLowerCase();
      const reasons: string[] = [];
      let score = product.rating * 6;

      if (intent.budget && product.price <= intent.budget) {
        score += 34;
        reasons.push("Within budget");
      } else if (intent.budget && product.price > intent.budget) {
        score -= Math.min(30, ((product.price - intent.budget) / intent.budget) * 50);
      }

      if (categoryTokens.some((token) => token.length > 3 && haystack.includes(token))) {
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
