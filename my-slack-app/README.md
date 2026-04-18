# my-slack-app

Slack ライクなリアルタイムチャットアプリケーションです。チャンネルベースのメッセージング、招待制チャンネル管理、既読表示、JWT 認証を備えています。

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | Next.js 16 / React 19 / TypeScript |
| スタイリング | Tailwind CSS v4 |
| バックエンド | Next.js API Routes |
| リアルタイム通信 | Socket.io |
| データベース | PostgreSQL 15 |
| ORM | Prisma 7 |
| 認証 | JWT (jose) / httpOnly Cookie |
| パスワードハッシュ | bcryptjs |

## 機能一覧

### 認証
- ユーザー登録（名前・メールアドレス・パスワード）
- ログイン / ログアウト
- JWT による認証（httpOnly Cookie で管理）
- 未認証時は自動的にログインページへリダイレクト

### チャンネル
- チャンネルの作成（作成者が自動的に管理者 ADMIN になる）
- **招待制**: 招待されたユーザーのみがチャンネルに参加・発言できる
- 自分が所属しているチャンネルのみサイドバーに表示
- チャンネル削除（ADMIN のみ）

### メンバー管理（ADMIN のみ）
- メールアドレスによるユーザー招待
- メンバーの削除（ADMIN 自身は削除不可）
- メンバー一覧の確認

### メッセージ
- リアルタイムメッセージ送受信（Socket.io）
- チャンネルメンバーのみ送受信可能
- 送信者名・送信時刻の表示
- **既読表示**: 自分が送ったメッセージを他のメンバーが閲覧すると、バブル横に「既読」を表示

## ディレクトリ構成

```
my-slack-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── channels/
│   │   │   │   ├── route.ts                    # GET チャンネル一覧 / POST チャンネル作成
│   │   │   │   └── [channelId]/
│   │   │   │       ├── route.ts                # DELETE チャンネル削除
│   │   │   │       ├── members/
│   │   │   │       │   └── route.ts            # GET/POST/DELETE メンバー管理
│   │   │   │       └── read-status/
│   │   │   │           └── route.ts            # GET 既読状態取得
│   │   │   ├── messages/route.ts               # GET メッセージ一覧
│   │   │   ├── users/route.ts                  # GET ユーザー一覧
│   │   │   ├── me/route.ts                     # GET 現在のユーザー情報
│   │   │   ├── login/route.ts                  # POST ログイン
│   │   │   ├── register/route.ts               # POST ユーザー登録
│   │   │   └── logout/route.ts                 # POST ログアウト
│   │   ├── chat/page.tsx                       # チャット画面
│   │   ├── login/page.tsx                      # ログイン画面
│   │   └── register/page.tsx                   # ユーザー登録画面
│   └── middleware.ts                           # 認証ルーティング
├── lib/
│   ├── auth.ts                                 # JWT ユーティリティ
│   └── db.ts                                   # Prisma クライアント
├── socket-server/
│   ├── index.ts                                # Socket.io サーバー
│   └── db.ts                                   # Prisma クライアント (socket 用)
├── prisma/
│   ├── schema.prisma                           # データベーススキーマ
│   └── migrations/                             # マイグレーションファイル
└── docker-compose.yml                          # PostgreSQL コンテナ設定
```

## データベーススキーマ

```prisma
model User {
  id        String    @id @default(uuid())
  name      String
  email     String    @unique
  password  String
  imageUrl  String?
  messages  Message[]
  channels  Member[]
}

model Channel {
  id       String    @id @default(uuid())
  name     String
  messages Message[]
  members  Member[]
}

// User と Channel の中間テーブル（ロール・既読管理）
model Member {
  id         String     @id @default(uuid())
  role       MemberRole @default(GUEST)  // ADMIN | MODERATOR | GUEST
  userId     String
  channelId  String
  lastReadAt DateTime?  // 最後に既読にした日時
  user       User       @relation(...)
  channel    Channel    @relation(...)
}

model Message {
  id        String  @id @default(uuid())
  content   String
  userId    String
  channelId String
  deleted   Boolean @default(false)
}

enum MemberRole { ADMIN MODERATOR GUEST }
```

## API エンドポイント

### 認証

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/register` | ユーザー登録 |
| POST | `/api/login` | ログイン |
| POST | `/api/logout` | ログアウト |
| GET | `/api/me` | 現在のユーザー情報取得 |

### チャンネル

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/channels` | 所属チャンネル一覧取得 | 認証済み |
| POST | `/api/channels` | チャンネル作成 | 認証済み |
| DELETE | `/api/channels/:channelId` | チャンネル削除 | ADMIN |

### メンバー管理

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/channels/:channelId/members` | メンバー一覧取得 | ADMIN |
| POST | `/api/channels/:channelId/members` | メンバー招待（メールアドレス） | ADMIN |
| DELETE | `/api/channels/:channelId/members` | メンバー削除 | ADMIN |

### 既読

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/channels/:channelId/read-status` | メンバー全員の既読日時取得 | メンバー |

### メッセージ / ユーザー

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/messages?channelId=:id` | メッセージ一覧取得 | メンバー |
| GET | `/api/users` | ユーザー一覧取得 | 認証済み |

### Socket.io イベント

| 方向 | イベント名 | 説明 |
|------|-----------|------|
| クライアント → サーバー | `join_room` | チャンネルに入室（メンバーシップ検証あり） |
| クライアント → サーバー | `send_message` | メッセージ送信（メンバーシップ検証あり） |
| クライアント → サーバー | `mark_read` | 自分の既読日時を更新 |
| サーバー → クライアント | `receive_message` | 新着メッセージの受信 |
| サーバー → クライアント | `read_update` | 誰かが既読にしたことを通知 |

---

## ローカル起動手順

### 前提条件

- Node.js 20 以上
- Docker / Docker Compose

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd basic-chat/my-slack-app
```

### 2. 依存パッケージのインストール

```bash
# メインアプリ
npm install

# Socket.io サーバー
cd socket-server
npm install
cd ..
```

### 3. 環境変数の設定

`.env` ファイルをプロジェクトルート（`my-slack-app/`）に作成します。

```env
# PostgreSQL 接続文字列
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/slack_clone_db"

# JWT 署名シークレット（任意の長い文字列）
JWT_SECRET="your-secret-key-here"

# フロントエンドの URL（Socket.io の CORS 設定に使用）
FRONTEND_URL="http://localhost:3000"

# Next.js からソケットサーバーへの接続先
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
```

### 4. PostgreSQL の起動

```bash
docker compose up -d
```

起動確認：

```bash
docker compose ps
```

### 5. データベースのマイグレーション

```bash
npx prisma migrate deploy
```

> スキーマを変更した場合は `npx prisma migrate dev` を使用します。

### 6. アプリケーションの起動

ターミナルを **2 つ** 開いて、それぞれ以下を実行します。

**ターミナル 1 — Next.js アプリ**

```bash
npm run dev
```

**ターミナル 2 — Socket.io サーバー**

```bash
cd socket-server
npm run dev
```

### 7. ブラウザでアクセス

```
http://localhost:3000
```

ユーザー登録 → ログイン → チャット画面の順で操作できます。

---

## 開発用コマンド

```bash
# Next.js 開発サーバー起動
npm run dev

# 型チェック
npx tsc --noEmit

# Lint
npm run lint

# Prisma Studio（DB の GUI 確認）
npx prisma studio

# Docker コンテナ停止
docker compose down

# Docker コンテナ停止 + データ削除
docker compose down -v
```
