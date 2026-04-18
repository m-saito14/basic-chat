// app/api/channels/[channelId]/read-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../../lib/db";
import { getSession } from "../../../../../../lib/auth";

type Params = { params: Promise<{ channelId: string }> };

// チャンネルメンバー全員の既読状態を取得 (メンバーなら誰でも可)
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { channelId } = await params;

  // メンバーシップチェック
  const member = await db.member.findFirst({
    where: { userId: session.userId, channelId },
  });
  if (!member) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const members = await db.member.findMany({
      where: { channelId },
      select: { userId: true, lastReadAt: true },
    });

    // { [userId]: ISO文字列 | null }
    const status = Object.fromEntries(
      members.map((m) => [m.userId, m.lastReadAt?.toISOString() ?? null])
    );

    return NextResponse.json(status);
  } catch (error) {
    console.log("[READ_STATUS_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
