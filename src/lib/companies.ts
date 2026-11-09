/**
 * "Hot" companies. The base list mirrors the FAANG+ set SimplifyJobs uses for
 * the 🔥 marker in their README (list_updater/constants.py), extended with
 * top-tier quant, AI and infrastructure employers.
 */
export const SIMPLIFY_FAANG_PLUS = [
  "airbnb", "adobe", "amazon", "amd", "anthropic", "apple", "asana", "atlassian",
  "bytedance", "cloudflare", "coinbase", "crowdstrike", "databricks", "datadog",
  "doordash", "dropbox", "duolingo", "figma", "google", "ibm", "instacart", "intel",
  "linkedin", "lyft", "meta", "microsoft", "netflix", "notion", "nvidia", "openai",
  "oracle", "palantir", "paypal", "perplexity", "pinterest", "ramp", "reddit",
  "rippling", "robinhood", "roblox", "salesforce", "samsara", "servicenow", "shopify",
  "slack", "snap", "snapchat", "spacex", "splunk", "snowflake", "stripe", "square",
  "tesla", "tinder", "tiktok", "uber", "visa", "waymo", "x",
];

export const EXTRA_HOT = [
  // Quant / trading
  "jane street", "citadel", "citadel securities", "two sigma", "hudson river trading",
  "jump trading", "d. e. shaw", "de shaw", "optiver", "imc trading", "imc",
  "susquehanna", "five rings", "tower research capital", "drw", "akuna capital",
  "virtu financial", "old mission", "point72", "millennium management",
  // AI / infra / dev tools
  "xai", "scale ai", "deepmind", "google deepmind", "mistral ai", "cohere", "nuro",
  "anduril", "vercel", "github", "mongodb", "plaid", "brex", "discord", "bloomberg",
  "character.ai", "hugging face", "cursor", "anysphere",
];

export const DEFAULT_HOT_COMPANIES = [...new Set([...SIMPLIFY_FAANG_PLUS, ...EXTRA_HOT])];

function words(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Matches a company name against a list by whole-word prefix, so "Amazon Web
 * Services" matches "amazon" but "Xilinx" does not match "x" and "Metabase"
 * does not match "meta".
 */
export function makeCompanyMatcher(names: string[]) {
  const patterns = names.map(words).filter((w) => w.length > 0);
  return (company: string) => {
    const w = words(company);
    return patterns.some((p) => p.length <= w.length && p.every((part, i) => w[i] === part));
  };
}

export const isDefaultHot = makeCompanyMatcher(DEFAULT_HOT_COMPANIES);
