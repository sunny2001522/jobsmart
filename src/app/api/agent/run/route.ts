import { NextResponse } from "next/server";
import { runNebiusCopilot, type CopilotAction } from "@/lib/ai/nebius";
import { getLatestLinkedInContext, recordAgentRun } from "@/lib/turso/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as CopilotAction;
    if (!["scout", "tailor", "coach", "plan"].includes(action)) {
      return NextResponse.json({ error: "Unsupported copilot action" }, { status: 400 });
    }
    const linkedInContext = await getLatestLinkedInContext();
    const profile = body.profile ?? linkedInContext?.text;
    const result = await runNebiusCopilot({ action, profile, job: body.job, transcript: body.transcript });
    await recordAgentRun({ action, provider: result.provider, model: result.model, request: body, response: result });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Copilot action failed", error);
    return NextResponse.json({ error: "Agent 暫時無法完成任務，請稍後再試" }, { status: 500 });
  }
}
