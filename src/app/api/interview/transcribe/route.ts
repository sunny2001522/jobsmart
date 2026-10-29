import { NextRequest, NextResponse } from "next/server";

// Keep uploads bounded even when the configured Nebius transcription model
// accepts larger files.
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "請提供音訊檔案" },
        { status: 400 }
      );
    }

    // 檢查檔案大小
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "檔案大小超過 25MB 限制" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEBIUS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Nebius API 未設定" },
        { status: 500 }
      );
    }

    const baseUrl = (process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1").replace(/\/$/, "");
    const payload = new FormData();
    payload.set("file", audioFile);
    payload.set("model", process.env.NEBIUS_TRANSCRIPTION_MODEL ?? "openai/whisper-large-v3-turbo");
    payload.set("language", "zh");
    payload.set("response_format", "json");

    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: payload,
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Nebius transcription failed (${response.status})`);
    const transcription = await response.json() as { text?: string };
    if (!transcription.text?.trim()) throw new Error("Nebius returned an empty transcription");

    return NextResponse.json({
      success: true,
      data: {
        text: transcription.text,
        transcribedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Transcription error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Invalid file format")) {
        return NextResponse.json(
          { success: false, error: "不支援的音訊格式" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "語音轉文字失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
