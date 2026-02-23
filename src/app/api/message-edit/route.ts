import { NextRequest, NextResponse } from "next/server";
import { editMessage } from "@/actions/message.action";

export async function POST(req: NextRequest) {
  try {
    const { messageId, newContent } = await req.json();
    if (!messageId || !newContent) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    const updated = await editMessage(messageId, newContent);
    return NextResponse.json({ message: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to edit message" }, { status: 500 });
  }
}
