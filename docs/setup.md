# セットアップ手順

## 必要なもの

| ツール | バージョン | 確認コマンド |
|--------|-----------|-------------|
| Node.js | 24以上 | `node -v` |
| npm | — | `npm -v` |
| Docker | — | `docker -v` |
| Docker Compose | — | `docker compose version` |

---

## 初回セットアップ

### 1. リポジトリのクローン

```bash
git clone <リポジトリURL>
cd basic-chat
```

### 2. Next.js アプリの依存関係インストール

```bash
cd my-slack-app
npm install
```

### 3. Socket.io サーバーの依存関係インストール

```bash
cd socket-server
npm install
cd ..
```

### 4. 環境変数の設定

`my-slack-app/.env` を作成します。Socket.io サーバーはこのファイルを共有して使用します。

```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/slack_clone_db"
```

> Socket.io サーバー専用の `.env` は不要です。起動スクリプトが `--env-file ../.env` で親ディレクトリの `.env` を参照します。

### 5. PostgreSQL の起動

```bash
cd my-slack-app
docker-compose up -d
```

コンテナの状態確認:

```bash
docker ps
# slack-clone-db が Up になっていればOK
```

### 6. DBマイグレーションの実行

```bash
cd my-slack-app
npx prisma migrate deploy
```

### 7. Prisma Client の生成

```bash
# メインアプリ（my-slack-app/）から実行
npx prisma generate

# socket-server 用のクライアント生成
cd socket-server
DATABASE_URL=<上記と同じURL> npx prisma generate
cd ..
```

---

## 開発サーバーの起動

2つのターミナルで並行して起動します。

**ターミナル 1: Socket.io サーバー（port 3001）**

```bash
cd my-slack-app/socket-server
npm run dev
# Socket server running on http://localhost:3001
```

**ターミナル 2: Next.js アプリ（port 3000）**

```bash
cd my-slack-app
npm run dev
# Next.js が http://localhost:3000 で起動
```

---

## よく使うコマンド

```bash
# Prisma Studio（ブラウザでDBを確認）
cd my-slack-app
npx prisma studio

# DBを停止
docker-compose down

# DBのデータも含めて削除
docker-compose down -v

# スキーマ変更後にマイグレーションを作成
npx prisma migrate dev --name <変更内容の名前>

# Prisma Client を再生成（スキーマ変更後に実行）
npx prisma generate
```

---

## 環境変数一覧

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|-----------|------|
| `DATABASE_URL` | 必須 | — | PostgreSQL 接続文字列 |
| `FRONTEND_URL` | 任意 | `http://localhost:3000` | Socket.io の CORS 許可オリジン |
| `SOCKET_PORT` | 任意 | `3001` | Socket.io サーバーのポート番号 |

---

## トラブルシューティング

### DBに接続できない

- `docker ps` でコンテナが起動しているか確認
- `.env` の `DATABASE_URL` が正しいか確認
- ポート5432が他のプロセスに使われていないか確認: `lsof -i :5432`

### Socket.io に接続できない

- Socket.io サーバー（port 3001）が起動しているか確認
- 接続元オリジンが許可されているか確認（デフォルト: `http://localhost:3000`）
- 別のオリジンから接続する場合は `FRONTEND_URL` 環境変数で指定する

### Prisma Client のエラー

- `npx prisma generate` を実行してクライアントを再生成する
- `DATABASE_URL` が正しく設定されているか確認する
