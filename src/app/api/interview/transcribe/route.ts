import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// 最大檔案大小 25MB (OpenAI 限制)
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OpenAI API 未設定" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // 使用 Whisper API 轉譯
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "zh", // 中文
      response_format: "json",
    });

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
      // OpenAI API 錯誤
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
