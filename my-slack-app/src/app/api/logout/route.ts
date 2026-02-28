// app/api/logout/route.ts
import { NextResponse } from "next/server";
import { deleteTokenCookie } from "../../../../lib/auth";

export async function POST() {
  const response = NextResponse.json({ message: "ok" });
  deleteTokenCookie(response);
  return response;
}
