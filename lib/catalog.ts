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
  { id: 1, name: "NovaSound Flex", category: "Wireless headphones", price: 1799, rating: 4.7, inventory: 18, description: "Clear mic, 38-hour battery and a comfortable over-ear fit.", tags: ["headphones", "online classes", "wireless", "microphone", "study", "comfort"], accent: "lime" },
  { id: 2, name: "ClearCall Lite", category: "Wireless headset", price: 1299, rating: 4.5, inventory: 27, description: "Lightweight headset with a focused boom microphone.", tags: ["headphones", "online classes", "wireless", "microphone", "calls", "lightweight"], accent: "blue" },
  { id: 3, name: "StudioMax Air", category: "Premium headphones", price: 2299, rating: 4.8, inventory: 8, description: "Rich sound, hybrid noise control and all-day cushioning.", tags: ["headphones", "music", "wireless", "premium", "noise control", "comfort"], accent: "orange" },
  { id: 4, name: "CarryShell Mini", category: "Protective case", price: 299, rating: 4.6, inventory: 35, description: "Water-resistant hard shell for compact headphones.", tags: ["case", "accessory", "travel", "gift"], accent: "violet" },
  { id: 5, name: "PocketBeat Go", category: "Wireless earbuds", price: 1499, rating: 4.4, inventory: 21, description: "Compact earbuds with low-latency audio and a pocket-sized case.", tags: ["earbuds", "wireless", "travel", "gaming", "gift", "compact"], accent: "violet" },
  { id: 6, name: "StudyBeam Mini", category: "Desk lamp", price: 999, rating: 4.6, inventory: 14, description: "Eye-comfort LED desk lamp with brightness and colour controls.", tags: ["study", "lamp", "desk", "gift", "comfort"], accent: "orange" },
  { id: 7, name: "ClickPro Silent", category: "Wireless mouse", price: 799, rating: 4.5, inventory: 31, description: "Quiet wireless mouse designed for study desks and shared spaces.", tags: ["mouse", "wireless", "study", "gift", "quiet"], accent: "blue" },
  { id: 8, name: "ChargeNest 20W", category: "Fast charger", price: 699, rating: 4.7, inventory: 42, description: "Compact USB-C fast charger with temperature protection.", tags: ["charger", "travel", "gift", "compact", "accessory"], accent: "lime" },
  { id: 9, name: "KeyFlow TKL", category: "Mechanical keyboard", price: 2499, rating: 4.6, inventory: 12, description: "Tenkeyless mechanical keyboard with tactile switches and RGB backlight.", tags: ["keyboard", "mechanical", "study", "gaming", "wireless"], accent: "lime" },
  { id: 10, name: "ViewStand Pro", category: "Laptop stand", price: 1199, rating: 4.5, inventory: 20, description: "Adjustable aluminium laptop stand for ergonomic desk setups.", tags: ["laptop", "stand", "study", "desk", "ergonomic", "comfort"], accent: "blue" },
  { id: 11, name: "HubLink 7-in-1", category: "USB hub", price: 1599, rating: 4.4, inventory: 16, description: "7-port USB-C hub with HDMI, SD card and 100W pass-through charging.", tags: ["hub", "usb", "laptop", "accessory", "travel", "compact"], accent: "violet" },
  { id: 12, name: "CoolPad Slim", category: "Laptop cooling pad", price: 899, rating: 4.3, inventory: 25, description: "Ultra-slim dual-fan cooling pad for 15-inch laptops.", tags: ["cooling", "laptop", "study", "gaming", "desk"], accent: "orange" },
  { id: 13, name: "SnapCam 1080", category: "Webcam", price: 1899, rating: 4.5, inventory: 10, description: "1080p webcam with auto-focus and built-in noise-cancelling mic.", tags: ["webcam", "online classes", "calls", "microphone", "study"], accent: "lime" },
  { id: 14, name: "DeskMate Organiser", category: "Desk organiser", price: 549, rating: 4.4, inventory: 30, description: "Bamboo desk organiser with phone slot, pen holder and cable tray.", tags: ["desk", "organiser", "study", "gift", "comfort"], accent: "orange" },
  { id: 15, name: "PowerBank 20K", category: "Power bank", price: 1299, rating: 4.6, inventory: 22, description: "20,000 mAh power bank with dual USB-A and USB-C fast charging.", tags: ["power bank", "travel", "charger", "compact", "gift"], accent: "blue" },
  { id: 16, name: "SoundBar Mini", category: "Bluetooth speaker", price: 1799, rating: 4.5, inventory: 15, description: "Compact Bluetooth 5.3 speaker with 12-hour battery and IPX5 rating.", tags: ["speaker", "bluetooth", "music", "travel", "gift", "wireless"], accent: "violet" },
  { id: 17, name: "ErgoGrip Pad", category: "Mouse pad", price: 399, rating: 4.3, inventory: 40, description: "Extended XXL mouse pad with non-slip base and stitched edges.", tags: ["mouse pad", "desk", "study", "gaming", "comfort"], accent: "lime" },
  { id: 18, name: "NeckEase Pillow", category: "Neck pillow", price: 699, rating: 4.4, inventory: 18, description: "Memory foam travel neck pillow with washable cover.", tags: ["pillow", "travel", "comfort", "gift"], accent: "orange" },
  { id: 19, name: "CableClip Set", category: "Cable management", price: 199, rating: 4.2, inventory: 60, description: "Set of 20 reusable silicone cable clips for desk and travel.", tags: ["cable", "accessory", "desk", "travel", "gift", "compact"], accent: "blue" },
  { id: 20, name: "ScreenShield 15", category: "Screen protector", price: 349, rating: 4.3, inventory: 28, description: "Anti-glare tempered glass screen protector for 15-inch laptops.", tags: ["screen", "laptop", "accessory", "study", "gift"], accent: "violet" },
];

const demoProduct = (
  id: number,
  name: string,
  category: string,
  price: number,
  description: string,
  tags: string[],
  accent: string,
): CatalogProduct => ({ id, name, category, price, rating: 4.6, inventory: 18, description, tags, accent });

export const demoStoreCatalogs: Record<string, CatalogProduct[]> = {
  merchant_nova: [
    demoProduct(1, "Everyday Cotton Tee", "Clothing", 599, "Soft breathable cotton tee for everyday wear.", ["clothing", "cotton", "casual"], "lime"),
    demoProduct(2, "Relaxed Denim Jacket", "Clothing", 2199, "Layer-ready denim jacket with a relaxed fit.", ["clothing", "denim", "jacket"], "blue"),
    demoProduct(3, "Stretch Chino Pants", "Clothing", 1499, "Comfort stretch chinos for office or weekend plans.", ["clothing", "chinos", "office"], "orange"),
    demoProduct(4, "Knit Polo Shirt", "Clothing", 899, "Smart-casual textured polo in soft knit fabric.", ["clothing", "polo", "smart casual"], "violet"),
    demoProduct(5, "Lightweight Hoodie", "Clothing", 1299, "Warm fleece hoodie with a clean everyday silhouette.", ["clothing", "hoodie", "winter"], "blue"),
    demoProduct(6, "Canvas Crossbody Bag", "Accessories", 749, "Hands-free canvas bag for daily essentials.", ["accessories", "bag", "casual"], "lime"),
  ],
  merchant_spark: [
    demoProduct(1, "Minimal Hoop Earrings", "Jewellery", 499, "Polished lightweight hoops for daily styling.", ["jewellery", "earrings", "minimal"], "violet"),
    demoProduct(2, "Leather Card Holder", "Wallets", 699, "Slim genuine-leather card holder with five slots.", ["wallet", "leather", "accessories"], "orange"),
    demoProduct(3, "Polarised Aviators", "Eyewear", 899, "UV-protected polarised sunglasses with metal frames.", ["eyewear", "sunglasses", "summer"], "blue"),
    demoProduct(4, "Silk Print Scarf", "Scarves", 799, "Lightweight printed scarf to elevate simple outfits.", ["scarf", "fashion", "gift"], "lime"),
    demoProduct(5, "Classic Leather Belt", "Belts", 649, "Durable leather belt with a brushed metal buckle.", ["belt", "leather", "formal"], "orange"),
    demoProduct(6, "Everyday Watch", "Watches", 1599, "Clean analogue watch with a comfortable vegan strap.", ["watch", "accessories", "formal"], "violet"),
  ],
  merchant_zenith: [
    demoProduct(1, "The Midnight Library", "Fiction", 399, "A thoughtful contemporary novel for quiet evenings.", ["book", "fiction", "reading"], "blue"),
    demoProduct(2, "Atomic Habits", "Self-help", 499, "A practical guide to building better daily routines.", ["book", "habits", "productivity"], "lime"),
    demoProduct(3, "The Illustrated Space Atlas", "Children's Books", 699, "A colourful introduction to planets and space exploration.", ["book", "science", "children"], "orange"),
    demoProduct(4, "Indian Cooking at Home", "Cookbooks", 549, "Approachable recipes for comforting Indian home meals.", ["book", "cooking", "recipes"], "violet"),
    demoProduct(5, "The Complete Short Stories", "Classics", 449, "A curated collection of unforgettable short fiction.", ["book", "classics", "literature"], "blue"),
    demoProduct(6, "Hardcover Reading Journal", "Stationery", 299, "A guided journal for notes, quotes and reading lists.", ["stationery", "journal", "gift"], "lime"),
  ],
  merchant_pixel: [
    demoProduct(1, "Handwoven Cotton Rug", "Textiles", 1799, "Soft handwoven rug with a calm geometric pattern.", ["home", "rug", "handmade"], "orange"),
    demoProduct(2, "Ceramic Table Vase", "Decor", 699, "Minimal glazed ceramic vase for flowers or branches.", ["home", "ceramic", "decor"], "blue"),
    demoProduct(3, "Scented Soy Candle Set", "Lighting", 599, "Three hand-poured soy candles with warm fragrances.", ["home", "candle", "aromatherapy"], "violet"),
    demoProduct(4, "Rattan Storage Basket", "Storage", 749, "Handwoven basket for blankets, toys or laundry.", ["home", "storage", "rattan"], "lime"),
    demoProduct(5, "Linen Cushion Cover", "Soft Furnishings", 399, "Textured linen cover with a concealed zip.", ["home", "cushion", "linen"], "orange"),
    demoProduct(6, "Wooden Wall Shelf", "Furniture", 1199, "Floating wooden shelf for books and small objects.", ["home", "wood", "shelf"], "blue"),
  ],
  merchant_orbit: [
    demoProduct(1, "Breathable Running Tee", "Running", 799, "Moisture-wicking tee for comfortable daily runs.", ["sports", "running", "moisture wicking"], "lime"),
    demoProduct(2, "Trail Running Shoes", "Footwear", 2499, "Grippy lightweight shoes for road and trail sessions.", ["sports", "shoes", "running"], "blue"),
    demoProduct(3, "Adjustable Yoga Mat", "Yoga", 999, "Cushioned non-slip mat for home or studio practice.", ["sports", "yoga", "fitness"], "violet"),
    demoProduct(4, "Insulated Steel Bottle", "Hydration", 699, "750ml bottle that keeps drinks cool through training.", ["sports", "bottle", "hydration"], "orange"),
    demoProduct(5, "Resistance Band Set", "Strength Training", 599, "Five resistance levels for full-body workouts.", ["sports", "fitness", "strength"], "blue"),
    demoProduct(6, "Compact Gym Duffel", "Bags", 1299, "Ventilated duffel with shoe compartment and wet pocket.", ["sports", "bag", "gym"], "lime"),
  ],
};

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

  const scored = source
    .filter((product) => product.inventory > 0)
    .map((product) => {
      const haystack = `${product.name} ${product.category} ${product.tags.join(" ")}`.toLowerCase();
      const reasons: string[] = [];
      let score = product.rating * 6;
      let hasSignal = false;

      if (intent.budget && product.price <= intent.budget) {
        score += 34;
        reasons.push("Within budget");
        hasSignal = true;
      } else if (intent.budget && product.price > intent.budget) {
        score -= Math.min(30, ((product.price - intent.budget) / intent.budget) * 50);
      }

      const categoryPhrase = intent.category.toLowerCase().trim();
      const categoryMatched =
        (categoryPhrase.length > 2 && haystack.includes(categoryPhrase)) ||
        categoryTokens.some((token) => token.length >= 3 && haystack.includes(token));
      if (categoryMatched) {
        score += 24;
        reasons.push("Category match");
        hasSignal = true;
      }

      if (useCase !== "general use" && haystack.includes(useCase)) {
        score += 18;
        reasons.push(`Good for ${intent.useCase}`);
        hasSignal = true;
      }

      const featureMatches = intent.features.filter((feature) =>
        haystack.includes(feature.toLowerCase()),
      );
      score += featureMatches.length * 12;
      if (featureMatches.length) {
        reasons.push(featureMatches.slice(0, 2).join(" + "));
        hasSignal = true;
      }

      return { ...product, score: Math.max(0, Math.round(score)), reasons, hasSignal };
    })
    .sort((a, b) => b.score - a.score);

  // Return only products with real signal (category/use-case/feature/budget match).
  // If nothing matches at all, return top 3 by rating as a fallback browse.
  const relevant = scored.filter((p) => p.hasSignal).slice(0, 6);
  const results = relevant.length ? relevant : scored.slice(0, 3).map((p) => ({ ...p, reasons: ["Strong rating", "Available now"] }));
  return results.map(({ hasSignal: _hs, ...p }) => p);
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