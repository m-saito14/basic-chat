// app/api/channels/route.ts
import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

// チャンネル一覧の取得
export async function GET(req: Request) {
  try {
    const channels = await db.channel.findMany({
      orderBy: {
        createdAt: "asc", // 作成順に並べる
      },
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.log("[CHANNELS_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// チャンネルの新規作成
export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    
    // 簡易的な認証チェック（本来はセッションからuserIdを取る）
    // const userId = ... 

    const channel = await db.channel.create({
      data: {
        name,
      },
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.log("[CHANNELS_POST_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}