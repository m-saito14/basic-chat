"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const registerRes = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!registerRes.ok) {
      setLoading(false);
      setError("登録に失敗しました。別のメールアドレスをお試しください。");
      return;
    }

    const loginRes = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!loginRes.ok) {
      setError("登録は完了しましたが、ログインに失敗しました。");
      return;
    }

    router.push("/chat");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900">アカウント作成</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? "作成中..." : "アカウント作成"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
