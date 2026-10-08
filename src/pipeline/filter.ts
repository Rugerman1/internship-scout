import type { Posting } from "../types";

// Cheap keyword filter that runs before any AI scoring, so we only pay to
// score postings that could plausibly be a civil internship.

const STUDENT_ROLE = /\b(intern(ship)?s?|co-?op|student|pathways|summer (engineer|associate|analyst))\b/i;

const CIVIL_FIELD = new RegExp(
  "\\b(" +
    [
      "civil", "transportation", "traffic", "roadway", "highway", "bridge",
      "structural", "geotechnical", "geo-?technical", "water resources", "stormwater",
      "hydraulic", "hydrology", "drainage", "wastewater", "utilities", "site development",
      "land development", "construction", "surveying", "environmental engineer",
      "municipal", "infrastructure", "pavement", "coastal",
    ].join("|") +
    ")\\b",
  "i",
);

// Titles we never want even if they mention an intern program.
const EXCLUDE_TITLE = /\b(senior|sr\.?|principal|manager|director|lead|software|marketing|accounting|finance|hr|human resources|sales)\b/i;

export function isCivilInternship(p: Posting): boolean {
  if (!STUDENT_ROLE.test(p.title)) return false;
  if (EXCLUDE_TITLE.test(p.title)) return false;
  // The field can show up in the title ("Civil Engineering Intern") or only in
  // the description ("Engineering Intern" on a transportation team).
  return CIVIL_FIELD.test(p.title) || CIVIL_FIELD.test(p.description.slice(0, 4000));
}
