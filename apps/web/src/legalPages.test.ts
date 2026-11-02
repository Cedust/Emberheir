import { describe, expect, it } from "vitest";
import { fillLegalTokens } from "../scripts/legalPages";

describe("the legal pages", () => {
  it("fill in the owner's details and escape them", () => {
    const { html, missing } = fillLegalTokens("<p>%LEGAL_NAME% · %LEGAL_EMAIL% · %OTHER%</p>", {
      LEGAL_NAME: "A & B",
      LEGAL_STREET: "Weg 1",
      LEGAL_CITY: "12345 Ort",
      LEGAL_EMAIL: "<a@b.de>",
    });
    expect(html).toBe("<p>A &amp; B · &lt;a@b.de&gt; · %OTHER%</p>");
    expect(missing).toEqual([]);
  });

  it("name what is missing", () => {
    const { html, missing } = fillLegalTokens("%LEGAL_CITY%", { LEGAL_NAME: "A" });
    expect(html).toBe("[nicht konfiguriert]");
    expect(missing).toEqual(["LEGAL_STREET", "LEGAL_CITY", "LEGAL_EMAIL"]);
  });
});
