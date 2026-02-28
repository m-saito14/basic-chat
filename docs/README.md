# basic-chat

Slackライクなリアルタイムチャットアプリケーションです。チャンネルベースのメッセージング機能を提供します。

## 概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | basic-chat / my-slack-app |
| 種別 | Webアプリケーション（学習用） |
| リアルタイム通信 | Socket.io (WebSocket) |
| データベース | PostgreSQL |

## ドキュメント一覧

- [アーキテクチャ](./architecture.md) — システム構成・技術スタック
- [データベース](./database.md) — スキーマ定義・ER図
- [API仕様](./api.md) — REST APIエンドポイント
- [セットアップ](./setup.md) — 環境構築手順

## クイックスタート

```bash
# 1. PostgreSQLをDockerで起動
cd my-slack-app
docker-compose up -d

# 2. DBマイグレーション実行
npx prisma migrate deploy

# 3. Socket.ioサーバー起動（ポート3001）
cd socket-server
npm run dev

# 4. Next.jsアプリ起動（ポート3000）
cd ..
npm run dev
```

ブラウザで `http://localhost:3000` にアクセス。
