/**
 * Normalize resume text into a predictable, single-column ATS format.
 * This only changes whitespace/markers; it never invents or removes resume facts.
 */

const SECTION_NAMES = [
  "Professional Summary",
  "Professional Profile",
  "Career Summary",
  "Summary",
  "Objective",
  "Work Experience",
  "Professional Experience",
  "Relevant Experience",
  "Experience",
  "Employment History",
  "Education",
  "Academic Background",
  "Skills",
  "Technical Skills",
  "Core Competencies",
  "Projects",
  "Certifications",
  "Awards",
  "Languages",
  "References",
  "個人簡介",
  "專業摘要",
  "教育背景",
  "工作經歷",
  "工作經驗",
  "專業經歷",
  "學歷",
  "技能",
  "專案",
  "證照",
  "獎項",
  "語言能力",
  "專案經驗",
  "職務摘要",
  "職務經歷",
  "職務経歴書",
  "自己紹介",
  "資格",
  "学歴",
  "職務経歴",
  "職務要約",
  "スキル",
  "项目经历",
  "工作经历",
  "专业摘要",
  "专业技能",
  "语言能力",
  "项目",
  "证书",
  "프로젝트",
  "경력",
  "학력",
  "기술",
  "프로페셔널 요약",
  "전문 요약",
  "자격증",
  "언어",
  "Perfil Profesional",
  "Resumen Profesional",
  "Experiencia",
  "Experiencia Profesional",
  "Experiencia Laboral",
  "Educación",
  "Formación Académica",
  "Habilidades",
  "Competencias",
  "Certificaciones",
  "Idiomas",
  "Proyectos",
  "Perfil professionnel",
  "Expérience professionnelle",
  "Expérience",
  "Formation",
  "Compétences",
  "Certifications",
  "Langues",
  "Kurzprofil",
  "Berufserfahrung",
  "Beruflicher Werdegang",
  "Ausbildung",
  "Kenntnisse",
  "Fähigkeiten",
  "Zertifikate",
  "Sprachen",
];

const SECTION_PATTERN = new RegExp(
  `(${SECTION_NAMES.map((name) => name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")).sort((a, b) => b.length - a.length).join("|")})`,
  "gi",
);

export function isResumeSection(value: string) {
  return SECTION_NAMES.some((name) => name.toLowerCase() === value.trim().toLowerCase());
}

function cleanLine(line: string) {
  return line
    .replace(/\u00a0/g, " ")
    .replace(/^\s{0,3}#{1,6}\s*/, "")
    .replace(/^\s*\*\*(.*?)\*\*\s*$/, "$1")
    .replace(/^\s*__(.*?)__\s*$/, "$1")
    .replace(/\s+$/g, "")
    .trim();
}

function splitAttachedSections(text: string) {
  return text.replace(SECTION_PATTERN, (match, _name, offset, source) => {
    const before = source.slice(0, offset);
    const after = source.slice(offset + match.length);
    const needsBeforeBreak = before.length > 0 && !/[\n\r]\s*$/.test(before);
    const needsAfterBreak = after.length > 0 && !/^[\n\r\s]/.test(after);
    return `${needsBeforeBreak ? "\n" : ""}${match}${needsAfterBreak ? "\n" : ""}`;
  });
}

export function formatResumeText(value: string | null | undefined) {
  if (!value) return "";

  const source = splitAttachedSections(value.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n"));
  const lines = source.split("\n").map(cleanLine);
  const result: string[] = [];

  for (const line of lines) {
    if (!line) {
      if (result.length && result[result.length - 1] !== "") result.push("");
      continue;
    }

    const bullet = line.match(/^(?:[-*•●▪◦‣]|\d+[.)])\s+(.*)$/);
    const normalized = bullet ? `- ${bullet[1].trim()}` : line;
    const isSection = isResumeSection(normalized);
    if (isSection && result.length && result[result.length - 1] !== "") result.push("");
    result.push(normalized);
    if (isSection) result.push("");
  }

  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function tipTapToResumeText(node: Record<string, unknown>) {
  const lines: string[] = [];
  const visit = (value: unknown, type?: string) => {
    if (!value || typeof value !== "object") return;
    const current = value as Record<string, unknown>;
    if (typeof current.text === "string") {
      lines.push(current.text);
      return;
    }
    const children = Array.isArray(current.content) ? current.content : [];
    if (type === "bulletList" || type === "orderedList") {
      for (const child of children) {
        const before = lines.length;
        visit(child, "listItem");
        if (lines.length > before) lines[before] = `- ${lines[before]}`;
      }
      return;
    }
    for (const child of children) visit(child, typeof child === "object" ? (child as Record<string, unknown>).type as string : undefined);
    if (["paragraph", "heading", "listItem"].includes(type || "")) lines.push("");
  };
  visit(node, String(node.type || "doc"));
  return formatResumeText(lines.join("\n"));
}

export function resumeTextToDocument(value: string) {
  const text = formatResumeText(value);
  const lines = text.split("\n");
  const content: Record<string, unknown>[] = [];
  let bullets: Record<string, unknown>[] = [];
  let hasName = false;
  let foundSection = false;
  const flushBullets = () => {
    if (bullets.length) {
      content.push({ type: "bulletList", content: bullets });
      bullets = [];
    }
  };

  for (const line of lines) {
    if (!line) {
      flushBullets();
      continue;
    }
    const bullet = line.match(/^-\s+(.*)$/);
    if (bullet) {
      bullets.push({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: bullet[1] }] }] });
      continue;
    }
    flushBullets();
    const isSection = isResumeSection(line);
    const isContact = /@|linkedin\.com|https?:\/\/|\+?\d[\d\s().-]{6,}/i.test(line);
    const isName = !hasName && !foundSection && !isSection;
    if (isName) hasName = true;
    if (isSection) foundSection = true;
    content.push({
      type: isSection || isName ? "heading" : "paragraph",
      ...(isSection ? { attrs: { level: 2 } } : isName ? { attrs: { level: 1, textAlign: "center" } } : isContact && content.length <= 1 ? { attrs: { textAlign: "center" } } : {}),
      content: [{ type: "text", text: line }],
    });
  }
  flushBullets();
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}
