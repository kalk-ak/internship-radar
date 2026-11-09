import { describe, expect, it } from "vitest";
import { isDefaultHot, makeCompanyMatcher } from "../src/lib/companies";

describe("company matcher", () => {
  it("matches whole-word prefixes", () => {
    expect(isDefaultHot("Amazon Web Services")).toBe(true);
    expect(isDefaultHot("Google")).toBe(true);
    expect(isDefaultHot("Jane Street")).toBe(true);
    expect(isDefaultHot("D. E. Shaw & Co.")).toBe(true);
  });

  it("does not match lookalike names", () => {
    expect(isDefaultHot("Xilinx")).toBe(false);
    expect(isDefaultHot("Metabase")).toBe(false);
    expect(isDefaultHot("Intelligent Systems")).toBe(false);
    expect(isDefaultHot("Snapdocs")).toBe(false);
  });

  it("supports custom lists", () => {
    const m = makeCompanyMatcher(["Capital One"]);
    expect(m("Capital One")).toBe(true);
    expect(m("capital one financial")).toBe(true);
    expect(m("Capital")).toBe(false);
  });
});
