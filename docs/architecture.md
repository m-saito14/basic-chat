# アーキテクチャ

## システム構成

```
ブラウザ (クライアント)
    │
    ├─── HTTP (REST API) ──────► Next.js アプリ (port 3000)
    │                                    │
    └─── WebSocket ────────────► Socket.io サーバー (port 3001)
                                         │
                                    PostgreSQL (port 5432)
                                  ※ Docker コンテナで管理
```

2つのサーバーが独立して動作します。

- **Next.js (port 3000)**: ページレンダリング + REST APIルート
- **Socket.io サーバー (port 3001)**: リアルタイムメッセージの送受信

どちらも同じ PostgreSQL データベースに接続します。

---

## ディレクトリ構成

```
basic-chat/
├── docs/                      # ドキュメント（このディレクトリ）
└── my-slack-app/              # アプリケーション本体
    ├── src/
    │   └── app/
    │       ├── page.tsx        # トップページ
    │       ├── layout.tsx      # 共通レイアウト
    │       └── api/            # REST APIルート
    │           ├── channels/route.ts
    │           ├── messages/route.ts
    │           └── register/route.ts
    ├── lib/
    │   └── db.ts               # Prisma Client（Next.js用ホットリロード対策シングルトン）
    ├── socket-server/          # Socket.ioサーバー（独立プロセス）
    │   ├── index.ts            # サーバーエントリーポイント
    │   ├── db.ts               # Prisma Client（ソケットサーバー用）
    │   ├── prisma.config.ts    # Prisma CLI設定（schema・migration パス）
    │   └── package.json
    ├── prisma/
    │   ├── schema.prisma       # DBスキーマ定義
    │   └── migrations/         # マイグレーションファイル
    └── docker-compose.yml      # PostgreSQL コンテナ設定
```

---

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 16.1.6 | Reactフレームワーク（App Router） |
| React | 19.2.3 | UIライブラリ |
| TypeScript | ^5 | 型安全な開発 |
| Tailwind CSS | ^4 | スタイリング |
| Lucide React | ^0.564.0 | アイコン |
| date-fns | ^4.1.0 | 日付フォーマット |
| clsx / tailwind-merge | — | クラス名の条件付き結合 |

### バックエンド（Socket サーバー）

| 技術 | 用途 |
|------|------|
| Socket.io | WebSocketによるリアルタイム通信 |
| tsx | TypeScriptの直接実行（Node.js `--import tsx/esm` ローダー） |

### データベース

| 技術 | バージョン | 用途 |
|------|-----------|------|
| PostgreSQL | 15 (Alpine) | リレーショナルDB |
| Prisma | ^7.4.0 | ORM（スキーマ管理・マイグレーション） |
| @prisma/adapter-pg | — | Prisma v7 用 PostgreSQL ドライバアダプタ |
| pg | — | Node.js 用 PostgreSQL クライアント |

> **Prisma v7 の変更点**: v7 からスキーマへの `url` 記述が廃止され、`PrismaClient` コンストラクタに `adapter` を渡す形式に変わった。`@prisma/adapter-pg` を使い `new PrismaClient({ adapter })` で接続する。

### インフラ

| 技術 | 用途 |
|------|------|
| Docker / Docker Compose | PostgreSQLコンテナの管理 |

---

## データフロー

### メッセージ送信フロー

```
1. クライアントが send_message イベントを Socket.io サーバーへ送信
2. Socket.io サーバーが Prisma 経由で PostgreSQL にメッセージを保存
3. 同じチャンネルにいる全クライアントへ receive_message イベントを broadcast
```

### 初期データ取得フロー

```
1. クライアントが Next.js の REST API (GET /api/messages?channelId=xxx) を呼び出し
2. Next.js が Prisma 経由で PostgreSQL から過去メッセージを取得して返却
```
