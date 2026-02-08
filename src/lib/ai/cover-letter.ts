/**
 * 求職信生成模組
 * 根據職缺和履歷生成客製化的求職信
 */

import { aiGateway } from "./gateway";

// 求職信生成結果
export interface CoverLetterDraft {
  subject: string;
  body: string;
  htmlBody?: string;
  attachmentNote: string;
  followUpDate: string;
}

const COVER_LETTER_SYSTEM_PROMPT = `你是一位專業的求職顧問，專精於撰寫客製化求職信。

## 任務
根據用戶的履歷和目標職缺，生成一封專業的求職信。

## 撰寫要求
1. **標題格式**：
   - 如有應徵方式提示，優先遵循指定格式
   - 預設格式：【應徵】{職位名稱} - {申請人姓名}

2. **內容結構**：
   - 開場：簡短自我介紹 + 表達對職位的興趣
   - 第一段：為什麼對這份工作/公司感興趣
   - 第二段：相關技能與經驗亮點（與 JD 呼應，使用具體數據和成果）
   - 第三段：能為公司帶來什麼價值
   - 結尾：感謝語 + 期待回覆

3. **風格**：
   - 專業但有溫度
   - 150-250 字為佳（不含問候語）
   - 避免過度謙虛或過度自信
   - 使用繁體中文
   - 不要使用太多感嘆號

4. **附件提醒**：
   - 結尾加上「履歷如附件，敬請參閱。」

請返回 JSON 格式：
{
  "subject": "Email 主旨",
  "body": "Email 內文（純文字，使用 \\n 換行）",
  "htmlBody": "Email 內文（HTML 格式，可選）",
  "attachmentNote": "建議附件說明",
  "followUpDate": "建議追蹤日期（ISO 格式，7天後）"
}

只返回 JSON，不要包含任何其他文字或 markdown 代碼塊。`;

/**
 * 生成求職信
 */
export async function generateCoverLetter(options: {
  companyName: string;
  position: string;
  jobDescription?: string;
  applicationInstruction?: string;
  resumePlainText?: string;
  applicantName?: string;
  contactEmail: string;
}): Promise<CoverLetterDraft> {
  const {
    companyName,
    position,
    jobDescription,
    applicationInstruction,
    resumePlainText,
    applicantName,
    contactEmail,
  } = options;

  const prompt = `
## 目標職缺資訊
公司名稱：${companyName}
職位名稱：${position}
收件人 Email：${contactEmail}
${applicationInstruction ? `應徵方式提示：${applicationInstruction}` : ""}

${jobDescription ? `## 職缺描述\n${jobDescription.slice(0, 2000)}` : ""}

${resumePlainText ? `## 申請人履歷摘要\n${resumePlainText.slice(0, 1500)}` : ""}

${applicantName ? `## 申請人姓名\n${applicantName}` : ""}
`;

  const result = await aiGateway("cover_letter_generation", prompt, {
    systemPrompt: COVER_LETTER_SYSTEM_PROMPT,
    temperature: 0.7,
    maxTokens: 2048,
  });

  try {
    let jsonStr = result.text.trim();
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    // 計算 7 天後的追蹤日期
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 7);

    return {
      subject: parsed.subject || `【應徵】${position} - ${applicantName || "求職者"}`,
      body: parsed.body || "",
      htmlBody: parsed.htmlBody,
      attachmentNote: parsed.attachmentNote || "履歷如附件",
      followUpDate: parsed.followUpDate || followUpDate.toISOString(),
    };
  } catch {
    // 解析失敗時返回基本模板
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 7);

    return {
      subject: `【應徵】${position} - ${applicantName || "求職者"}`,
      body: `您好，

我對貴公司的 ${position} 職位非常感興趣，希望有機會加入 ${companyName}。

附上我的履歷供您參考，期待有機會與您進一步討論。

謝謝您的時間。

${applicantName || "求職者"} 敬上`,
      attachmentNote: "履歷如附件",
      followUpDate: followUpDate.toISOString(),
    };
  }
}

/**
 * 格式化 Email 為 RFC 2822 格式
 */
export function formatEmailForGmail(options: {
  to: string;
  subject: string;
  body: string;
  from?: string;
}): string {
  const { to, subject, body, from } = options;

  const lines = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
  ];

  if (from) {
    lines.unshift(`From: ${from}`);
  }

  lines.push("");
  lines.push(Buffer.from(body).toString("base64"));

  return lines.join("\r\n");
}

/**
 * 格式化 Email 為 base64url 編碼（Gmail API 需要）
 */
export function encodeEmailForGmailApi(rawEmail: string): string {
  return Buffer.from(rawEmail)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
