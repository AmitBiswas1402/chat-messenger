import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const STREAM_API_SECRET = process.env.STREAM_SECRET_KEY!;
const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Stream token payload (see docs for claims)
  const payload = {
    user_id: userId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h expiry
  };

  const token = jwt.sign(payload, STREAM_API_SECRET);

  return NextResponse.json({ token, apiKey: STREAM_API_KEY });
}
