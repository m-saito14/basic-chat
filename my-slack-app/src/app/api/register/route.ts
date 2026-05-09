// app/api/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "../../../../lib/db";

export async function POST(req: Request) {
  try {
    const { name, email, password } = (await req.json()) as { name: string; email: string; password: string };

    if (!email || !name || !password) {
      return new NextResponse("Missing info", { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.log("[REGISTER_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}