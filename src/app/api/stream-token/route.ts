import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const STREAM_API_SECRET = process.env.STREAM_SECRET_KEY!;
const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

