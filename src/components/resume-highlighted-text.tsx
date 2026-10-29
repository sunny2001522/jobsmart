function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function ResumeHighlightedText({ text, phrases }: { text: string; phrases?: string[] }) {
  const validPhrases = Array.from(new Set((phrases ?? []).map((phrase) => phrase.trim()).filter(Boolean)))
    .sort((a, b) => b.length - a.length);
  if (validPhrases.length === 0) return <>{text}</>;

  const pattern = new RegExp(`(${validPhrases.map(escapeRegExp).join("|")})`, "gi");
  return <>{text.split(pattern).map((part, index) => {
    const isHighlight = validPhrases.some((phrase) => phrase.toLocaleLowerCase() === part.toLocaleLowerCase());
    return isHighlight
      ? <mark key={index} className="rounded-sm bg-amber-200 px-0.5 text-inherit dark:bg-amber-700/70">{part}</mark>
      : <span key={index}>{part}</span>;
  })}</>;
}
