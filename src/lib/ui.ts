import type { Category } from "./types";

/** Category colours plus plain-language labels used across the app. */
export const CATEGORY_STYLE: Record<Category, { dot: string; text: string; label: string }> = {
  Software: { dot: "bg-cat-software", text: "text-cat-software", label: "Software" },
  "AI/ML/Data": { dot: "bg-cat-ai", text: "text-cat-ai", label: "AI & ML" },
  Quant: { dot: "bg-cat-quant", text: "text-cat-quant", label: "Quant" },
  Hardware: { dot: "bg-cat-hardware", text: "text-cat-hardware", label: "Hardware" },
  Product: { dot: "bg-cat-product", text: "text-cat-product", label: "Product" },
};
