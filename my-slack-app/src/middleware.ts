import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "token";

const PUBLIC_PATHS = ["/login", "/register"];

async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`)
  );
  const token = match?.[1];
  const isAuthenticated = token ? await verifyToken(token) : false;

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname === p);
  const isApiRoute = pathname.startsWith("/api/");

  // 認証済み + /login, /register → /chat にリダイレクト
  if (isAuthenticated && isPublicPage) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // 未認証 + 保護 API → 401
  if (!isAuthenticated && isApiRoute) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 未認証 + 保護ページ → /login にリダイレクト
  if (!isAuthenticated && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/login|api/logout|api/register).*)",
  ],
};
