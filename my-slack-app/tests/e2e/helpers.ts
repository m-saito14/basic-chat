/** テスト用のベース URL (globalSetup で設定される) */
export function baseUrl(): string {
  return process.env.TEST_BASE_URL ?? "http://localhost:3001";
}

export function apiUrl(path: string): string {
  return `${baseUrl()}${path}`;
}

/** テストデータを一意にするサフィックスを生成する */
export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** ユーザーを登録する */
export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<{ id: string; name: string; email: string; createdAt: string }> {
  const res = await fetch(apiUrl("/api/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`registerUser failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/** ログインして認証 Cookie 文字列を返す */
export async function login(
  email: string,
  password: string
): Promise<{ cookie: string; user: { id: string; name: string; email: string } }> {
  const res = await fetch(apiUrl("/api/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`login failed (${res.status}): ${await res.text()}`);
  }

  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/token=([^;]+)/);
  if (!match) throw new Error("No token cookie in login response");

  return { cookie: `token=${match[1]}`, user: await res.json() };
}

/** 認証 Cookie を含む共通ヘッダーを返す */
export function authHeaders(cookie: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Cookie: cookie,
  };
}
