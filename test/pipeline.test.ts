import { describe, expect, it } from "vitest";
import gh from "./fixtures/greenhouse.json";
import lv from "./fixtures/lever.json";
import uj from "./fixtures/usajobs.json";
import { parseGreenhouse } from "../src/sources/greenhouse";
import { parseLever } from "../src/sources/lever";
import { parseUsaJobs } from "../src/sources/usajobs";
import { htmlToText } from "../src/sources/html";
import { isCivilInternship } from "../src/pipeline/filter";
import { dedupe, dedupeKey } from "../src/pipeline/dedupe";
import type { Firm, Posting } from "../src/types";

const firm: Firm = { name: "Example Engineers, Inc.", board: "greenhouse", slug: "example" };

describe("sources", () => {
  it("parses Greenhouse and strips its double-escaped HTML", () => {
    const [p] = parseGreenhouse(firm, gh);
    expect(p).toMatchObject({ source: "greenhouse", sourceId: "4011", location: "Greenville, SC" });
    expect(p!.description).toContain("Join our transportation team.");
    expect(p!.description).toContain("- Assist with roadway design");
    expect(p!.description).not.toContain("<");
  });

  it("parses Lever, including requirement lists", () => {
    const [p] = parseLever({ ...firm, board: "lever" }, lv);
    expect(p!.title).toBe("Engineering Co-op (Water Resources)");
    expect(p!.description).toContain("Commitment: Co-op");
    expect(p!.description).toContain("ABET civil engineering");
    expect(p!.postedAt).toMatch(/^2026-/);
  });

  it("parses USAJOBS with the agency as the company", () => {
    const [p] = parseUsaJobs(uj);
    expect(p).toMatchObject({ company: "U.S. Army Corps of Engineers", closesAt: "2026-10-30T23:59:59" });
    expect(p!.description).toContain("hydraulic analysis");
  });

  it("decodes numeric entities", () => {
    expect(htmlToText("Smith &#38; Jones")).toBe("Smith & Jones");
  });
});

describe("filter", () => {
  const all = [
    ...parseGreenhouse(firm, gh),
    ...parseLever({ ...firm, board: "lever" }, lv),
    ...parseUsaJobs(uj),
  ];

  it("keeps civil internships and co-ops only", () => {
    expect(all.filter(isCivilInternship).map((p) => p.title)).toEqual([
      "Civil Engineering Intern - Summer 2027",
      "Engineering Co-op (Water Resources)",
      "Student Trainee (Civil Engineering)",
    ]);
  });
});

describe("dedupe", () => {
  const base: Posting = {
    source: "greenhouse", sourceId: "1", company: "Example Engineers, Inc.",
    title: "Civil Engineering Internship - Summer 2027", location: "Greenville, SC, USA",
    url: "u", description: "short", postedAt: null, closesAt: null,
  };

  it("treats re-posts and board copies as the same internship", () => {
    const copy = { ...base, source: "lever" as const, sourceId: "x", company: "Example Engineers",
      title: "Civil Engineering Intern (Summer 2028)", location: "Greenville, SC", description: "a longer description" };
    expect(dedupeKey(copy)).toBe(dedupeKey(base));
    const out = dedupe([base, copy]);
    expect(out).toHaveLength(1);
    expect(out[0]!.description).toBe("a longer description");
  });

  it("keeps different offices apart", () => {
    expect(dedupe([base, { ...base, location: "Charleston, SC" }])).toHaveLength(2);
  });
});
