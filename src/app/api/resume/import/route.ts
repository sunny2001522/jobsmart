import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

function toPlainText(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 50000);
}

function toDocument(text: string) {
  const paragraphs = text.split(/\n{2,}|\r\n/).map((part) => part.trim()).filter(Boolean);
  return {
    type: "doc",
    content: paragraphs.length ? paragraphs.map((part) => ({ type: "paragraph", content: [{ type: "text", text: part }] })) : [{ type: "paragraph" }],
  };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const source = String(form.get("source") || "text");
    let text = String(form.get("text") || "");
    let sourceName = "匯入履歷";

    if (source === "url") {
      const rawUrl = String(form.get("url") || "").trim();
      const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
      if (!/^https?:\/\/[^\s]+$/i.test(url)) return NextResponse.json({ error: "請輸入有效的公開履歷連結" }, { status: 400 });
      const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 JobSmart Resume Import" }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) return NextResponse.json({ error: "無法讀取這個連結，請確認它是公開頁面或改用貼上文字" }, { status: 422 });
      text = toPlainText(await response.text());
      sourceName = url.includes("linkedin.com") ? "LinkedIn 履歷" : "連結履歷";
    }

    if (source === "file") {
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "請選擇 PDF、TXT 或 Markdown 檔案" }, { status: 400 });
      sourceName = file.name.replace(/\.[^.]+$/, "") || sourceName;
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
        const parsed = await parser.getText();
        text = parsed.text;
        await parser.destroy();
      } else {
        text = await file.text();
      }
    }

    text = text.trim().slice(0, 50000);
    if (text.length < 20) return NextResponse.json({ error: "找不到足夠的履歷文字，請改用公開連結、PDF 或貼上完整內容" }, { status: 422 });
    return NextResponse.json({ data: { name: sourceName, plainText: text, content: toDocument(text) } });
  } catch (error) {
    console.error("Resume import failed", error);
    return NextResponse.json({ error: "履歷解析失敗，請改用貼上文字再試一次" }, { status: 500 });
  }
}
