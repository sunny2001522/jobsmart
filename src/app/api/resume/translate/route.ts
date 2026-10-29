import { NextResponse } from "next/server";
import { z } from "zod";
import { translateResumeForATS } from "@/lib/ai/gateway";
import { RESUME_LANGUAGES } from "@/lib/resume/languages";

const requestSchema = z.object({
  content: z.string().min(20).max(30000),
  targetLanguage: z.string().refine((code) => RESUME_LANGUAGES.some((language) => language.code === code)),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const text = await translateResumeForATS(body.content, body.targetLanguage);
    return NextResponse.json({ data: { text } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "請提供履歷內容和支援的目標語言" }, { status: 400 });
    }
    console.error("Resume translation failed", error);
    return NextResponse.json({ error: "履歷翻譯失敗，請稍後重試" }, { status: 502 });
  }
}
