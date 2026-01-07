import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLinkedInContent, type LinkedInContentType } from "@/lib/ai/linkedin";

const generateSchema = z.object({
  contentType: z.enum(["headline", "about", "experience", "summary"]),
  currentContent: z.string().optional(),
  targetRole: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experiences: z
    .array(
      z.object({
        title: z.string(),
        company: z.string(),
        description: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = generateSchema.parse(body);

    const result = await generateLinkedInContent({
      contentType: data.contentType as LinkedInContentType,
      currentContent: data.currentContent,
      targetRole: data.targetRole,
      skills: data.skills,
      experiences: data.experiences,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        contentType: data.contentType,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "驗證錯誤" },
        { status: 400 }
      );
    }

    console.error("LinkedIn generate error:", error);
    return NextResponse.json(
      { success: false, error: "生成失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
