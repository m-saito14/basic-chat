// app/api/messages/route.ts
import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return new NextResponse("Channel ID missing", { status: 400 });
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