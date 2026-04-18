// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

// ユーザー一覧取得 (招待候補用)
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const users = await db.user.findMany({
      where: { id: { not: session.userId } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.log("[USERS_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
