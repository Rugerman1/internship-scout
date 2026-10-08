import type { Posting } from "../types";

// USAJOBS search API: federal jobs such as the Army Corps of Engineers.
// Needs a free key from https://developer.usajobs.gov/apirequest/
// Series 0810 is Civil Engineering. HiringPath=student limits results to
// Pathways internships and other student programs.
interface UsaJobsItem {
  MatchedObjectId: string;
  MatchedObjectDescriptor: {
    PositionTitle: string;
    PositionURI: string;
    PositionLocationDisplay?: string;
    OrganizationName?: string;
    DepartmentName?: string;
    QualificationSummary?: string;
    PublicationStartDate?: string;
    ApplicationCloseDate?: string;
    UserArea?: { Details?: { JobSummary?: string; MajorDuties?: string[] } };
  };
}

export const USAJOBS_SEARCHES = [
  "JobCategoryCode=0810&HiringPath=student&ResultsPerPage=250",
  "Keyword=civil%20engineering%20intern&ResultsPerPage=250",
];

export function parseUsaJobs(body: {
  SearchResult?: { SearchResultItems?: UsaJobsItem[] };
}): Posting[] {
  return (body.SearchResult?.SearchResultItems ?? []).map((item) => {
    const d = item.MatchedObjectDescriptor;
    const org = [d.OrganizationName, d.DepartmentName].filter(Boolean);
    return {
      source: "usajobs",
      sourceId: item.MatchedObjectId,
      company: org[0] ?? "U.S. Government",
      title: d.PositionTitle.trim(),
      location: d.PositionLocationDisplay ?? "",
      url: d.PositionURI,
      description: [
        org.join(", "),
        d.UserArea?.Details?.JobSummary ?? "",
        ...(d.UserArea?.Details?.MajorDuties ?? []),
        d.QualificationSummary ?? "",
      ]
        .filter(Boolean)
        .join("\n"),
      postedAt: d.PublicationStartDate ?? null,
      closesAt: d.ApplicationCloseDate ?? null,
    };
  });
}

export async function fetchUsaJobs(apiKey: string, email: string): Promise<Posting[]> {
  const all: Posting[] = [];
  for (const query of USAJOBS_SEARCHES) {
    const res = await fetch(`https://data.usajobs.gov/api/search?${query}`, {
      headers: { "Authorization-Key": apiKey, "User-Agent": email, Host: "data.usajobs.gov" },
    });
    if (!res.ok) throw new Error(`USAJOBS: HTTP ${res.status}`);
    all.push(...parseUsaJobs(await res.json()));
  }
  return all;
}
