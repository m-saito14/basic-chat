以下の手順でコミット前チェックを実施し、問題がなければコミットを作成してください。

## ステップ 1: 変更内容の把握

```bash
git status
git diff --cached   # ステージ済み
git diff            # 未ステージ
```

変更ファイルと差分の内容を確認し、コミットの目的を明確にする。

## ステップ 2: 横展開チェック

変更したパターン（関数名・型・定数・エラーメッセージなど）を Grep で検索し、
同じ修正が必要な箇所が他のファイルに残っていないか確認する。

- API Route を追加・変更した場合 → 同様の Route に同じパターンが必要か確認
- Prisma モデルを変更した場合 → 関連する全ての DB 操作箇所を確認
- Socket イベントを追加した場合 → クライアント側の受信処理も確認

## ステップ 3: テストコードの確認

変更内容に対応するテストが存在するか確認する。

| 変更箇所 | 対応テスト |
|---|---|
| `my-slack-app/src/app/api/` | `my-slack-app/tests/e2e/*.test.ts` |
| `socket-server/index.ts` | `socket-server/tests/*.test.ts` |
| `my-slack-app/lib/` | 関連する E2E テスト |

**テストが存在しない場合はコミット前にテストを追加する。**

## ステップ 4: セキュリティチェック

以下の項目を確認する：

- [ ] `dangerouslySetInnerHTML` や `eval` の新規使用がないか
- [ ] 外部リンク（`target="_blank"`）に `rel="noopener noreferrer"` があるか
- [ ] API キー・パスワード・JWT Secret のハードコードがないか
- [ ] JWT 検証で `jwtVerify` を正しく使っているか（`alg` の確認含む）
- [ ] Prisma の `$queryRaw` / `$executeRaw` を使う場合、パラメータをバインドしているか
- [ ] Cookie は `httpOnly: true, secure: true, sameSite: "lax"` になっているか

## ステップ 5: 型チェック・Lint の実行

```bash
# Next.js アプリの変更がある場合（my-slack-app/ で実行）
npx tsc --noEmit
npm run lint

# socket-server の変更がある場合（socket-server/ で実行）
npx tsc --noEmit
```

エラーがあれば修正してから次のステップへ。

## ステップ 6: テスト実行

```bash
# Next.js API の変更がある場合（my-slack-app/ で実行・要 DB 起動）
npm run test:e2e

# socket-server の変更がある場合（socket-server/ で実行・要 DB 起動）
npm test
```

テストが全て通ることを確認する。

## ステップ 7: README 更新確認

変更内容が以下に該当する場合は `my-slack-app/README.md` を更新する：

- 新しい API エンドポイントの追加
- Socket.io イベントの追加・変更
- 環境変数の追加
- 起動手順の変更

## ステップ 8: コミット作成

上記チェックが全て完了したら、以下の形式でコミットを作成する：

```
<変更種別>: <変更内容の要約（日本語 50 字以内）>

<必要に応じて詳細説明>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

変更種別の例：`feat`, `fix`, `refactor`, `test`, `docs`, `chore`
