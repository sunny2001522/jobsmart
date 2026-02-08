import { aiGateway } from "./gateway";

export type LinkedInContentType = "headline" | "about" | "experience" | "summary";

interface GenerateLinkedInOptions {
  contentType: LinkedInContentType;
  currentContent?: string;
  targetRole?: string;
  skills?: string[];
  experiences?: Array<{
    title: string;
    company: string;
    description: string;
  }>;
}

const CONTENT_TYPE_PROMPTS: Record<LinkedInContentType, string> = {
  headline: `生成一個專業的 LinkedIn 標題 (Headline)。
要求：
- 120 字元以內
- 突出專業領域和核心價值
- 包含關鍵字以提高搜尋曝光
- 避免使用「尋找機會」等被動用語`,

  about: `生成一段專業的 LinkedIn 關於 (About) 段落。
要求：
- 300-500 字
- 第一人稱書寫
- 包含：專業背景、核心技能、職涯目標、個人特色
- 使用故事性開頭吸引注意
- 結尾加入行動呼籲 (CTA)`,

  experience: `優化 LinkedIn 工作經歷描述。
要求：
- 使用強動詞開頭 (領導、開發、優化、提升...)
- 量化成果 (提升 30% 效率、管理 5 人團隊...)
- 使用 bullet points 格式
- 突出關鍵技能和成就`,

  summary: `生成一段簡短的職涯摘要。
要求：
- 150-200 字
- 適合作為求職信開頭或自我介紹
- 突出獨特價值主張
- 專業但有個人特色`,
};

export async function generateLinkedInContent(
  options: GenerateLinkedInOptions
): Promise<{
  content: string;
  keywords: string[];
  suggestions: string[];
}> {
  const { contentType, currentContent, targetRole, skills, experiences } = options;

  let prompt = CONTENT_TYPE_PROMPTS[contentType];

  if (targetRole) {
    prompt += `\n\n目標職位：${targetRole}`;
  }

  if (skills && skills.length > 0) {
    prompt += `\n\n技能專長：${skills.join(", ")}`;
  }

  if (experiences && experiences.length > 0) {
    prompt += `\n\n工作經歷：`;
    experiences.forEach((exp) => {
      prompt += `\n- ${exp.title} @ ${exp.company}: ${exp.description}`;
    });
  }

  if (currentContent) {
    prompt += `\n\n目前內容（需優化）：\n${currentContent}`;
  }

  prompt += `\n\n請返回 JSON 格式：
{
  "content": "生成的內容",
  "keywords": ["關鍵字1", "關鍵字2"],
  "suggestions": ["額外建議1", "額外建議2"]
}
只返回 JSON，不要其他文字。`;

  const result = await aiGateway("linkedin_generate", prompt, {
    systemPrompt: "你是一位專業的 LinkedIn 顧問，專精於個人品牌打造和職涯發展。請用繁體中文回答。",
    temperature: 0.7,
  });

  try {
    return JSON.parse(result.text);
  } catch {
    return {
      content: result.text,
      keywords: [],
      suggestions: [],
    };
  }
}

// 分析現有內容並給予改善建議
export async function analyzeLinkedInProfile(profileContent: string): Promise<{
  score: number;
  strengths: string[];
  improvements: string[];
  keywordSuggestions: string[];
}> {
  const prompt = `分析以下 LinkedIn Profile 內容：

${profileContent}

請評估並給予建議，返回 JSON 格式：
{
  "score": 0-100 的整數分數,
  "strengths": ["優點1", "優點2"],
  "improvements": ["改進建議1", "改進建議2"],
  "keywordSuggestions": ["建議加入的關鍵字1", "關鍵字2"]
}
只返回 JSON，不要其他文字。`;

  const result = await aiGateway("linkedin_generate", prompt, {
    systemPrompt: "你是一位專業的 LinkedIn 顧問和 HR 專家。請用繁體中文回答。",
    temperature: 0.5,
  });

  try {
    return JSON.parse(result.text);
  } catch {
    return {
      score: 50,
      strengths: [],
      improvements: ["無法分析，請稍後再試"],
      keywordSuggestions: [],
    };
  }
}
