# アーキテクチャ

## システム構成

```
ブラウザ (クライアント)
    │
    ├─── HTTP (REST API) ──────► Next.js アプリ (port 3000)
    │         Cookie (JWT)               │
    │                                    │
    └─── WebSocket (JWT auth) ─► Socket.io サーバー (port 3001)
                                         │
                                    PostgreSQL (port 5432)
                                  ※ Docker コンテナで管理
```

2つのサーバーが独立して動作します。

- **Next.js (port 3000)**: ページレンダリング + REST APIルート + 認証処理
- **Socket.io サーバー (port 3001)**: リアルタイムメッセージの送受信（JWT検証済み接続のみ受け付け）

どちらも同じ PostgreSQL データベースに接続します。

---

## 認証フロー

```
1. /register でアカウント作成（bcryptjs でパスワードハッシュ化）
2. /login で認証 → JWT を httpOnly Cookie にセット（有効期限 7日）
3. 保護ページ・APIへのリクエスト時、Cookie が自動送信されミドルウェアが検証
4. /api/me で JWT トークン文字列を取得（JS は httpOnly Cookie を読めないため）
5. Socket.io 接続時に auth.token に JWT を渡してサーバー側で検証
```

### ルート保護（middleware.ts）

| 条件 | 処理 |
|------|------|
| 未認証 + 保護ページ（/chat など） | /login にリダイレクト |
| 未認証 + 保護 API（/api/*） | 401 JSON を返す |
| 認証済み + /login, /register | /chat にリダイレクト |
| その他 | 素通し |

認証チェックが不要なエンドポイント: `/api/login`, `/api/logout`, `/api/register`

---

## ディレクトリ構成

```
basic-chat/
├── docs/                      # ドキュメント（このディレクトリ）
└── my-slack-app/              # アプリケーション本体
    ├── src/
    │   ├── middleware.ts       # ルート保護（Edge Runtime）
    │   └── app/
    │       ├── page.tsx        # トップページ（/ → /chat にリダイレクト）
    │       ├── layout.tsx      # 共通レイアウト
    │       ├── login/page.tsx  # ログインページ
    │       ├── register/page.tsx # 登録ページ
    │       ├── chat/page.tsx   # メインチャット画面
    │       └── api/            # REST APIルート
    │           ├── login/route.ts
    │           ├── logout/route.ts
    │           ├── me/route.ts
    │           ├── register/route.ts
    │           ├── channels/route.ts
    │           └── messages/route.ts
    ├── lib/
    │   ├── auth.ts             # JWT発行・検証・Cookie操作ユーティリティ
    │   └── db.ts               # Prisma Client（Next.js用ホットリロード対策シングルトン）
    ├── socket-server/          # Socket.ioサーバー（独立プロセス）
    │   ├── index.ts            # サーバーエントリーポイント（JWT認証ミドルウェア含む）
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
| socket.io-client | — | Socket.io クライアント |

### バックエンド（Next.js API）

| 技術 | 用途 |
|------|------|
| bcryptjs | パスワードのハッシュ化・比較 |
| jose | JWT の生成・検証（Edge Runtime 対応） |

### バックエンド（Socket サーバー）

| 技術 | 用途 |
|------|------|
| Socket.io | WebSocketによるリアルタイム通信 |
| jose | JWT の検証（接続認証ミドルウェア） |
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

### ログインフロー

```
1. クライアントが POST /api/login でメールアドレス・パスワードを送信
2. bcrypt.compare でパスワードを検証
3. 検証成功 → JWT を生成し httpOnly Cookie にセット
4. クライアントが GET /api/me で JWT トークン文字列を取得
5. Socket.io 接続時に auth.token にトークンを渡す
```

### メッセージ送信フロー

```
1. クライアントが send_message イベントを Socket.io サーバーへ送信
   （userId は含めない）
2. Socket.io サーバーが接続時に検証済みの socket.data.userId を使用
3. Prisma 経由で PostgreSQL にメッセージを保存
4. 同じチャンネルにいる全クライアントへ receive_message イベントを broadcast
```

### 初期データ取得フロー

```
1. クライアントが Next.js の REST API (GET /api/messages?channelId=xxx) を呼び出し
   （Cookie が自動送信され認証される）
2. Next.js が Prisma 経由で PostgreSQL から過去メッセージを取得して返却
```
