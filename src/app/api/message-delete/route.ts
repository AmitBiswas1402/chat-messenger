import { NextRequest, NextResponse } from "next/server";
import { deleteMessage } from "@/actions/message.action";

export async function POST(req: NextRequest) {
  try {
    const { messageId } = await req.json();
    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
    }
    const deleted = await deleteMessage(messageId);
    return NextResponse.json({ message: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete message" }, { status: 500 });
  }
}
