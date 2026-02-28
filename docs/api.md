# API仕様

Next.js の App Router を使用した REST API です。ベースURL: `http://localhost:3000`

---

## ユーザー登録

### POST /api/register

新しいユーザーを作成します。

**リクエストボディ**

```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "password123"
}
```

**レスポンス（200 OK）**

```json
{
  "id": "uuid",
  "name": "山田太郎",
  "email": "yamada@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**エラーレスポンス**

| ステータス | 説明 |
|-----------|------|
| 400 | name / email / password のいずれかが未指定 |
| 500 | サーバーエラー |

> 注意: 現在パスワードは平文で保存されています。本番運用では `bcrypt` などでハッシュ化が必要です。

---

## チャンネル

### GET /api/channels

チャンネル一覧を作成日時の昇順で返します。

**レスポンス（200 OK）**

```json
[
  {
    "id": "uuid",
    "name": "general",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api/channels

新しいチャンネルを作成します。

**リクエストボディ**

```json
{
  "name": "general"
}
```

**レスポンス（200 OK）**

```json
{
  "id": "uuid",
  "name": "general",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## メッセージ

### GET /api/messages?channelId={channelId}

指定チャンネルのメッセージ一覧を作成日時の昇順で返します。送信者情報（user）もJOINして返却します。

**クエリパラメータ**

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| channelId | 必須 | 取得対象のチャンネルID |

**レスポンス（200 OK）**

```json
[
  {
    "id": "uuid",
    "content": "こんにちは！",
    "fileUrl": null,
    "userId": "uuid",
    "channelId": "uuid",
    "deleted": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": "uuid",
      "name": "山田太郎",
      "email": "yamada@example.com",
      "imageUrl": null
    }
  }
]
```

**エラーレスポンス**

| ステータス | 説明 |
|-----------|------|
| 400 | channelId が未指定 |
| 500 | サーバーエラー |

---

## Socket.io イベント（port 3001）

REST API とは別に、リアルタイム通信には Socket.io を使用します。

### クライアント → サーバー

| イベント名 | ペイロード | 説明 |
|-----------|-----------|------|
| `join_room` | `roomId: string` | チャンネル（ルーム）に参加する |
| `send_message` | `{ roomId, text, userId }` | メッセージを送信する |

### サーバー → クライアント

| イベント名 | ペイロード | 説明 |
|-----------|-----------|------|
| `receive_message` | Message オブジェクト（user付き） | 新着メッセージを受信する |
| `error` | `{ message: string }` | メッセージ保存失敗時にエラーを通知する |
