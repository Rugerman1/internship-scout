import { z } from "zod";

// The structured resume the scorer and cover-letter writer read.
// Keeping it as JSON (instead of a PDF) means the AI sees exactly the facts
// you approved, and the cover letter can only draw on those facts.
export const ResumeSchema = z.object({
  name: z.string(),
  email: z.string(),
  school: z.string(),
  major: z.string(),
  class_standing: z.string(), // e.g. "Sophomore"
  graduation: z.string(), // e.g. "May 2029"
  gpa: z.string().optional(),
  location: z.string(), // where you live during the school year
  willing_to_relocate: z.array(z.string()), // regions or states you'd work in
  interests: z.array(z.string()), // e.g. "transportation", "water resources"
  coursework: z.array(z.string()),
  skills: z.array(z.string()),
  certifications: z.array(z.string()), // e.g. "EIT (planned)", "OSHA 10"
  experience: z.array(
    z.object({ role: z.string(), org: z.string(), dates: z.string(), bullets: z.array(z.string()) }),
  ),
  projects: z.array(z.object({ name: z.string(), bullets: z.array(z.string()) })),
  activities: z.array(z.string()),
  work_authorization: z.string(), // e.g. "U.S. citizen"
  dealbreakers: z.array(z.string()), // things that should lower a score
});
export type Resume = z.infer<typeof ResumeSchema>;
