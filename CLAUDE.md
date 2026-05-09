# Claude Code 運用ガイド — basic-chat

## プロジェクト概要

Next.js ベースの Slack ライクなチャットアプリ。
フロントエンド + REST API（Next.js）と リアルタイム通信（Socket.io）の 2 サーバー構成。

---

## ディレクトリ構成

```
basic-chat/
├── my-slack-app/          # Next.js アプリ（メイン）
│   ├── src/               # App Router ページ・コンポーネント・API Routes
│   ├── prisma/            # スキーマ・マイグレーション（共有）
│   ├── lib/               # サーバー共通ロジック（auth, db）
│   ├── tests/e2e/         # Next.js API の E2E テスト（Vitest）
│   ├── socket-server/     # Socket.io サーバー（独立プロセス）
│   │   └── tests/         # Socket.io 統合テスト（Vitest）
│   └── CLAUDE.md          # アプリ固有ルール（必ず参照）
└── .github/workflows/     # CI/CD（lint-and-build / test / test-socket-server）
```

---

## 開発コマンド

### Next.js アプリ（`my-slack-app/` で実行）

```bash
npm run dev              # 開発サーバー起動（port 3000）
npm run build            # 本番ビルド確認
npm run lint             # ESLint
npx tsc --noEmit         # TypeScript 型チェック
npm run test:e2e         # E2E テスト実行（要 DB・port 3001）
```

### Socket.io サーバー（`my-slack-app/socket-server/` で実行）

```bash
npm run dev              # 開発サーバー起動（port 3001）
npm test                 # 統合テスト実行（port 3002・要 DB）
```

### DB 操作（`my-slack-app/` で実行）

```bash
npx prisma generate      # Prisma クライアント生成
npx prisma migrate dev   # マイグレーション作成・適用
npx prisma migrate deploy # マイグレーション適用（本番）
npx prisma studio        # DB ブラウザ UI
docker-compose up -d     # ローカル PostgreSQL 起動（要 Colima）
```

---

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| API | Next.js Route Handlers, HTTP-only JWT Cookie |
| リアルタイム | Socket.io 4（JWT 認証ミドルウェア） |
| ORM | Prisma 7 + @prisma/adapter-pg |
| DB | PostgreSQL 15 |
| 認証 | jose (JWT), bcryptjs (パスワードハッシュ) |
| テスト | Vitest 4 (E2E + 統合テスト) |

---

## ブランチ・PR 戦略

```
main       ← リリース済みコード
develop    ← 統合ブランチ（PR はここに向ける）
feature/*  ← 機能開発
fix/*      ← バグ修正
```

**PR → develop** で CI が自動実行される：
1. `lint-and-build` — 型チェック・ESLint・本番ビルド確認
2. `test` — Next.js E2E テスト（PostgreSQL サービス）
3. `test-socket-server` — Socket.io 統合テスト（PostgreSQL サービス）

---

## アーキテクチャ上の注意

- `prisma/schema.prisma` は `my-slack-app/` に一つだけ存在し、両サーバーが共有する
- `socket-server/` は `my-slack-app/node_modules` の `@prisma/adapter-pg`, `pg` を参照する（独自インストール不要）
- JWT は `jose` で生成・検証（`jose` は両サーバーの dependency）
- E2E テストポート: Next.js=3001, Socket.io テスト=3002（本番 Socket.io=3001 と分離）

---

## サブプロジェクト固有ルール

`my-slack-app/CLAUDE.md` に記載：
- ドキュメント管理・コミットルール
- コミット前の必須チェックリスト（横展開・セキュリティ・パフォーマンス・テスト・README）
