// app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return new NextResponse("Channel ID missing", { status: 400 });
    }

    // メンバーシップチェック
    const member = await db.member.findFirst({
      where: { userId: session.userId, channelId },
    });
    if (!member) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const messages = await db.message.findMany({
      where: {
        channelId,
      },
      include: {
        user: true, // 送信者の名前やアイコンも一緒に取得する (JOIN)
      },
      orderBy: {
        createdAt: "asc", // 古い順に取得
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.log("[MESSAGES_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}