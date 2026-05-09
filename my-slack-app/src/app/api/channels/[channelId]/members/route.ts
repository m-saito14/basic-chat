// app/api/channels/[channelId]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../../lib/db";
import { getSession } from "../../../../../../lib/auth";

type Params = { params: Promise<{ channelId: string }> };

// チャンネルメンバー一覧取得
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { channelId } = await params;

  // リクエスト者がADMINか確認
  const requester = await db.member.findFirst({
    where: { userId: session.userId, channelId },
  });
  if (!requester || requester.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const members = await db.member.findMany({
      where: { channelId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.log("[MEMBERS_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// ユーザーをチャンネルへ招待 (ADMIN のみ)
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { channelId } = await params;

  // リクエスト者がADMINか確認
  const requester = await db.member.findFirst({
    where: { userId: session.userId, channelId },
  });
  if (!requester || requester.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { email } = (await req.json()) as { email: string };

    const targetUser = await db.user.findUnique({ where: { email } });
    if (!targetUser) {
      return new NextResponse("ユーザーが見つかりません", { status: 404 });
    }

    // 既に招待済みか確認
    const existing = await db.member.findFirst({
      where: { userId: targetUser.id, channelId },
    });
    if (existing) {
      return new NextResponse("既にメンバーです", { status: 409 });
    }

    const member = await db.member.create({
      data: { userId: targetUser.id, channelId, role: "GUEST" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.log("[MEMBERS_POST_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// メンバーをチャンネルから削除 (ADMIN のみ)
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { channelId } = await params;

  // リクエスト者がADMINか確認
  const requester = await db.member.findFirst({
    where: { userId: session.userId, channelId },
  });
  if (!requester || requester.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { userId } = (await req.json()) as { userId: string };

    // ADMINは自分自身を削除できない
    if (userId === session.userId) {
      return new NextResponse("管理者は自分自身を削除できません", { status: 400 });
    }

    await db.member.deleteMany({
      where: { userId, channelId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[MEMBERS_DELETE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
