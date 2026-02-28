# データベース

## 接続情報（開発環境）

| 項目 | 値 |
|------|----|
| ホスト | localhost |
| ポート | 5432 |
| DB名 | slack_clone_db |
| ユーザー | myuser |
| パスワード | mypassword |
| コンテナ名 | slack-clone-db |

> 本番環境では環境変数 `DATABASE_URL` で上書きすること。

---

## ER図

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    User      │       │    Member    │       │   Channel    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)      │    ┌──│ id (PK)      │
│ name         │  └───►│ userId (FK)  │    │  │ name         │
│ email        │       │ channelId(FK)│◄───┘  │ createdAt    │
│ password     │       │ role         │       │ updatedAt    │
│ imageUrl     │       │ createdAt    │       └──────┬───────┘
│ createdAt    │       │ updatedAt    │              │
│ updatedAt    │       └──────────────┘              │
└──────┬───────┘                                     │
       │                                             │
       │          ┌──────────────┐                   │
       └─────────►│   Message    │◄──────────────────┘
                  ├──────────────┤
                  │ id (PK)      │
                  │ content      │
                  │ fileUrl      │
                  │ userId (FK)  │
                  │ channelId(FK)│
                  │ deleted      │
                  │ createdAt    │
                  │ updatedAt    │
                  └──────────────┘
```

---

## テーブル定義

### User（ユーザー）

| カラム | 型 | 説明 |
|--------|----|------|
| id | String (UUID) | 主キー |
| name | String | 表示名 |
| email | String | メールアドレス（ユニーク） |
| password | String | パスワード（※現在平文保存。本番ではハッシュ化必須） |
| imageUrl | String? | アバター画像URL（任意） |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

### Channel（チャンネル）

| カラム | 型 | 説明 |
|--------|----|------|
| id | String (UUID) | 主キー |
| name | String | チャンネル名 |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

### Member（メンバー：UserとChannelの中間テーブル）

| カラム | 型 | 説明 |
|--------|----|------|
| id | String (UUID) | 主キー |
| role | MemberRole | 権限（ADMIN / MODERATOR / GUEST） |
| userId | String | Userへの外部キー |
| channelId | String | Channelへの外部キー |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

### Message（メッセージ）

| カラム | 型 | 説明 |
|--------|----|------|
| id | String (UUID) | 主キー |
| content | Text | メッセージ本文 |
| fileUrl | String? | 添付ファイルURL（任意） |
| userId | String | 送信者（Userへの外部キー） |
| channelId | String | 送信先（Channelへの外部キー） |
| deleted | Boolean | 論理削除フラグ（デフォルト: false） |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

### MemberRole（Enum）

| 値 | 説明 |
|----|------|
| ADMIN | 管理者 |
| MODERATOR | モデレーター |
| GUEST | 一般ユーザー（デフォルト） |

---

## マイグレーション

```bash
# マイグレーションファイルを作成して適用
npx prisma migrate dev --name <マイグレーション名>

# 本番環境への適用
npx prisma migrate deploy

# スキーマをDBに強制同期（開発用・データ消えるので注意）
npx prisma db push

# Prisma Studio（GUIでDBを確認）
npx prisma studio
```
