# API仕様

Next.js の App Router を使用した REST API です。ベースURL: `http://localhost:3000`

認証が必要なエンドポイントは、ログイン時に発行される **httpOnly Cookie (`token`)** を自動で送信することで認証されます。

---

## 認証

### POST /api/register

新しいユーザーを作成します。認証不要。

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
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**エラーレスポンス**

| ステータス | 説明 |
|-----------|------|
| 400 | name / email / password のいずれかが未指定 |
| 500 | サーバーエラー |

> パスワードは bcryptjs でハッシュ化して保存されます（ソルト: 10）。レスポンスに password は含まれません。

---

### POST /api/login

認証してセッション Cookie を発行します。認証不要。

**リクエストボディ**

```json
{
  "email": "yamada@example.com",
  "password": "password123"
}
```

**レスポンス（200 OK）**

```json
{
  "id": "uuid",
  "name": "山田太郎",
  "email": "yamada@example.com"
}
```

Set-Cookie ヘッダーで JWT トークンが httpOnly Cookie として発行されます（有効期限: 7日）。

**エラーレスポンス**

| ステータス | 説明 |
|-----------|------|
| 400 | email / password が未指定 |
| 401 | メールアドレスまたはパスワードが正しくない |
| 500 | サーバーエラー |

---

### POST /api/logout

セッション Cookie を削除します。認証不要。

**レスポンス（200 OK）**

```json
{ "message": "ok" }
```

---

### GET /api/me

現在のセッションユーザー情報を返します。**認証必要**。

Socket.io の handshake に渡すための JWT トークン文字列も返します（httpOnly Cookie は JS から読めないため）。

**レスポンス（200 OK）**

```json
{
  "userId": "uuid",
  "name": "山田太郎",
  "email": "yamada@example.com",
  "token": "<JWT文字列>"
}
```

**エラーレスポンス**

| ステータス | 説明 |
|-----------|------|
| 401 | 未認証 |

---

## チャンネル

### GET /api/channels

チャンネル一覧を作成日時の昇順で返します。**認証必要**。

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

**エラーレスポンス**

| ステータス | 説明 |
|-----------|------|
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### POST /api/channels

新しいチャンネルを作成します。**認証必要**。作成者が Member として自動追加されます。

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

**エラーレスポンス**

| ステータス | 説明 |
|-----------|------|
| 401 | 未認証 |
| 500 | サーバーエラー |

---

## メッセージ

### GET /api/messages?channelId={channelId}

指定チャンネルのメッセージ一覧を作成日時の昇順で返します。送信者情報（user）もJOINして返却します。**認証必要**。

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
| 401 | 未認証 |
| 500 | サーバーエラー |

---

## Socket.io イベント（port 3001）

REST API とは別に、リアルタイム通信には Socket.io を使用します。

### 接続認証

接続時に `auth.token` に `/api/me` で取得した JWT トークンを渡す必要があります。

```javascript
const socket = io("http://localhost:3001", {
  auth: { token: "<JWTトークン>" },
});
```

トークンが無効な場合は `connect_error` が発生し、接続が拒否されます。

### クライアント → サーバー

| イベント名 | ペイロード | 説明 |
|-----------|-----------|------|
| `join_room` | `roomId: string` | チャンネル（ルーム）に参加する |
| `send_message` | `{ roomId: string, text: string }` | メッセージを送信する（userId は不要。サーバー側で認証済みIDを使用） |

### サーバー → クライアント

| イベント名 | ペイロード | 説明 |
|-----------|-----------|------|
| `receive_message` | Message オブジェクト（user付き） | 新着メッセージを受信する |
| `error` | `{ message: string }` | メッセージ保存失敗時にエラーを通知する |
