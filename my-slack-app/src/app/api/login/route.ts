// app/api/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "../../../../lib/db";
import { signToken, setTokenCookie } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as { email: string; password: string };

    if (!email || !password) {
      return new NextResponse("Missing info", { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return new NextResponse("Invalid credentials", { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return new NextResponse("Invalid credentials", { status: 401 });
    }

    const token = await signToken({
      userId: user.id,
      name: user.name,
      email: user.email,
    });

    const response = NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
    setTokenCookie(response, token);
    return response;
  } catch (error) {
    console.log("[LOGIN_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
