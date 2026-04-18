// app/api/channels/[channelId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

type Params = { params: Promise<{ channelId: string }> };

// チャンネル削除 (ADMIN のみ)
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { channelId } = await params;

  // リクエスト者が ADMIN か確認
  const member = await db.member.findFirst({
    where: { userId: session.userId, channelId },
  });
  if (!member || member.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    await db.channel.delete({ where: { id: channelId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[CHANNEL_DELETE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
