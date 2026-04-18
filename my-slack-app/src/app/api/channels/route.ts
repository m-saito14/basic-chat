// app/api/channels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

// チャンネル一覧の取得 (自分が所属しているチャンネルのみ)
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const channels = await db.channel.findMany({
      where: {
        members: {
          some: { userId: session.userId },
        },
      },
      include: {
        members: {
          where: { userId: session.userId },
          select: { role: true },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const result = channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      myRole: ch.members[0]?.role ?? "GUEST",
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.log("[CHANNELS_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// チャンネルの新規作成
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { name } = await req.json();

    const channel = await db.channel.create({
      data: {
        name,
        members: {
          create: { userId: session.userId, role: "ADMIN" },
        },
      },
    });

    return NextResponse.json({ id: channel.id, name: channel.name, myRole: "ADMIN" });
  } catch (error) {
    console.log("[CHANNELS_POST_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}