import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { ResumeTemplate } from "@/lib/pdf/resume-template";
import { z } from "zod";

const exportSchema = z.object({
  content: z.union([z.record(z.string(), z.unknown()), z.string()]),
  title: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, title } = exportSchema.parse(body);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(createElement(ResumeTemplate, { content: content as any, title }));

    const filename = title ? `${title}.pdf` : "resume.pdf";

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "驗證錯誤" },
        { status: 400 }
      );
    }

    console.error("PDF export error:", error);
    return NextResponse.json(
      { success: false, error: "PDF 匯出失敗" },
      { status: 500 }
    );
  }
}
