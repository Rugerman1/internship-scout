// Job boards return descriptions as HTML. The scorer only needs the words,
// so this turns HTML into readable plain text.
const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

export function htmlToText(html: string): string {
  // Greenhouse double-escapes its HTML, so decode once before stripping tags.
  const decoded = decodeEntities(html);
  return decodeEntities(
    decoded
      .replace(/<(br|\/p|\/li|\/h\d|\/div)\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}
