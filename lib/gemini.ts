import { extractIntentWithRules, type ShoppingIntent } from "./catalog";
import { getRuntimeValue } from "./runtime-env";

type GeminiInteractionResponse = Record<string, unknown>;

const intentSchema = {
  type: "object",
  properties: {
    budget: {
      type: ["integer", "null"],
      description: "Maximum budget in Indian rupees, or null if not supplied.",
    },
    category: {
      type: "string",
      description:
        "Short product category requested by the customer, translated to English so it matches an English-language catalogue even if the request was in Hindi or Hinglish.",
    },
    useCase: {
      type: "string",
      description:
        "The main situation in which the product will be used, in English.",
    },
    features: {
      type: "array",
      items: { type: "string" },
      maxItems: 6,
      description: "Important customer preferences stated or strongly implied, in English.",
    },
    explanation: {
      type: "string",
      description: "One short sentence explaining the extracted intent, in English.",
    },
    language: {
      type: "string",
      description:
        "The language the customer wrote in: 'en' for English, 'hi' for Hindi (Devanagari script), or 'hinglish' for Romanized Hindi.",
    },
  },
  required: ["budget", "category", "useCase", "features", "explanation", "language"],
  additionalProperties: false,
};

function findText(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["output_text", "text"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
    for (const child of Object.values(record)) {
      const found = findText(child);
      if (found) return found;
    }
  }
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = findText(child);
      if (found) return found;
    }
  }
  return null;
}

function isIntent(value: unknown): value is ShoppingIntent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ShoppingIntent>;
  return (
    (candidate.budget === null || typeof candidate.budget === "number") &&
    typeof candidate.category === "string" &&
    typeof candidate.useCase === "string" &&
    Array.isArray(candidate.features) &&
    candidate.features.every((feature) => typeof feature === "string") &&
    typeof candidate.explanation === "string" &&
    typeof candidate.language === "string"
  );
}

export async function extractShoppingIntent(
  query: string,
  options?: { forceRules?: boolean },
): Promise<{
  intent: ShoppingIntent;
  engine: "gemini" | "rules";
}> {
  const apiKey = getRuntimeValue("GEMINI_API_KEY");
  const model = getRuntimeValue("GEMINI_MODEL") ?? "gemini-3.7-flash";
  if (!apiKey || options?.forceRules) {
    return { intent: extractIntentWithRules(query), engine: "rules" };
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          input: `Extract shopping intent from this customer request. The customer may write in English, Hindi (Devanagari script), or Hinglish (Romanized Hindi). Detect which language they used. Regardless of the input language, return category, useCase, features and explanation in English so they match an English-language catalogue. Do not invent a budget or feature. Request: ${query}`,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: intentSchema,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed with ${response.status}`);
    }

    const payload = (await response.json()) as GeminiInteractionResponse;
    const outputText = findText(payload);
    if (!outputText) throw new Error("Gemini returned no structured text");

    const parsed = JSON.parse(outputText) as unknown;
    if (!isIntent(parsed)) throw new Error("Gemini intent failed validation");

    return { intent: parsed, engine: "gemini" };
  } catch {
    return { intent: extractIntentWithRules(query), engine: "rules" };
  }
}