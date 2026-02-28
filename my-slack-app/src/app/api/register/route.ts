// app/api/register/route.ts
import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !name || !password) {
      return new NextResponse("Missing info", { status: 400 });
    }

    // 本来はここでパスワードのハッシュ化 (bcryptなど) 
    const user = await db.user.create({
      data: {
        name,
        email,
        password, // 学習用のため平文保存。実運用ではNG
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.log("[REGISTER_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}