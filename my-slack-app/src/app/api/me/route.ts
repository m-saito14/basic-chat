// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession, signToken } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // httpOnly Cookie は JS から読めないので Socket.io handshake 用にトークンを返す
  const token = await signToken({
    userId: session.userId,
    name: session.name,
    email: session.email,
  });

  return NextResponse.json({ ...session, token });
}
