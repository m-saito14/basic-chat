本プロジェクトに新機能を追加するための標準手順を実行してください。
機能の内容はユーザーの指示または直前の会話から読み取ってください。

## ステップ 1: 影響範囲の特定

追加する機能がどの層に関わるか確認する：

| 層 | ファイル | 判断基準 |
|---|---|---|
| DB スキーマ | `prisma/schema.prisma` | 新しいモデル・フィールドが必要か |
| REST API | `src/app/api/` | HTTP リクエストが必要か |
| Socket イベント | `socket-server/index.ts` | リアルタイム通信が必要か |
| UI | `src/app/`, `src/components/` | 画面変更が必要か |
| 共通ロジック | `lib/` | 複数箇所で使うロジックか |

## ステップ 2: 設計の確認

実装前にユーザーに確認する：
- API エンドポイント名・HTTP メソッド（例: `POST /api/channels`）
- Socket イベント名（例: `join_room`, `send_message`）
- 認証が必要か（全エンドポイントはデフォルトで認証必須）
- DB への影響（新規マイグレーションが必要か）

## ステップ 3: DB スキーマ変更（必要な場合）

```bash
# my-slack-app/ で実行
npx prisma migrate dev --name <マイグレーション名>
npx prisma generate
```

## ステップ 4: バックエンド実装

### REST API（`src/app/api/<path>/route.ts`）

既存の API Route のパターンを参考に実装する：
- Cookie から JWT を取得して `jwtVerify` でユーザー認証
- `lib/db.ts` の `db` を使って Prisma クエリ
- バリデーションエラーは 400、認証エラーは 401、成功は 200 を返す
- `NextResponse.json()` でレスポンス

### Socket イベント（`socket-server/index.ts`）

既存イベントのパターンを参考に実装する：
- `socket.data.userId` でユーザー ID を取得（JWT 認証済み）
- `db.member.findFirst()` でチャンネルアクセス権を確認
- エラーは `socket.emit("error", { message: "..." })` で返す
- 成功時は `io.to(roomId).emit(...)` でブロードキャスト

## ステップ 5: フロントエンド実装

既存コンポーネントのパターンを参照して実装する。

## ステップ 6: テストの作成（必須）

### REST API テスト（`tests/e2e/<feature>.test.ts`）

```typescript
// 既存の auth.test.ts / channels.test.ts を参考に
describe("POST /api/<endpoint>", () => {
  // 認証なし → 401
  // バリデーション不正 → 400
  // 正常ケース → 200 + 期待するレスポンス
  // 権限なし → 401/403
});
```

### Socket テスト（`socket-server/tests/<feature>.test.ts`）

```typescript
// 既存の join-room.test.ts / send-message.test.ts を参考に
describe("<event_name> イベント", () => {
  // 非メンバー → error イベント
  // メンバー → 期待するイベントが届く + DB 確認
});
```

## ステップ 7: 動作確認

```bash
# テスト実行（my-slack-app/ で）
npm run test:e2e

# Socket テスト実行（socket-server/ で）
npm test

# 型チェック
npx tsc --noEmit
npm run lint
```

## ステップ 8: ドキュメント更新

`my-slack-app/README.md` に以下を追記・更新する：
- 新しい API エンドポイント
- 新しい Socket イベント
- 環境変数（追加した場合）

## ステップ 9: コミット

`/commit` スキルを使ってコミット前チェックを実施してからコミットする。
