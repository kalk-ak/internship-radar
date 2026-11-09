import type { Category } from "./types";

/** Category colours act like syntax highlighting across the app. */
export const CATEGORY_STYLE: Record<Category, { dot: string; text: string; short: string }> = {
  Software: { dot: "bg-cat-software", text: "text-cat-software", short: "swe" },
  "AI/ML/Data": { dot: "bg-cat-ai", text: "text-cat-ai", short: "ai/ml" },
  Quant: { dot: "bg-cat-quant", text: "text-cat-quant", short: "quant" },
  Hardware: { dot: "bg-cat-hardware", text: "text-cat-hardware", short: "hw" },
  Product: { dot: "bg-cat-product", text: "text-cat-product", short: "pm" },
};
