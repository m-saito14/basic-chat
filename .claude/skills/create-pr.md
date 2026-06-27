develop ブランチへの GitHub PR を作成します。

## ステップ 1: 事前チェック

以下を実行して現在の状態を確認する：

```bash
git branch --show-current
git status --short
git log develop..HEAD --oneline
```

確認事項：
- `main` または `develop` ブランチにいる場合: 中止し、`feature/*` か `fix/*` ブランチで作業するよう伝える
- 未コミットの変更がある場合: 中止し、先に `/commit` スキルを実行するよう伝える
- `develop..HEAD` のコミットが 0 件の場合: 中止し、変更がない旨を伝える

## ステップ 2: リモートへプッシュ

```bash
git push -u origin HEAD
```

## ステップ 3: PR 内容の生成

`pr-creator` エージェントを起動して PR のタイトルと本文を生成する。
エージェントへ以下の情報を渡す：
- 現在のブランチ名
- `git log develop..HEAD --oneline` の出力
- `git diff develop..HEAD --stat` の出力

## ステップ 4: PR 作成

エージェントが返したタイトルと本文で PR を作成する：

```bash
gh pr create --base develop --assignee @me --title "<タイトル>" --body "$(cat <<'EOF'
<本文>
EOF
)"
```

作成された PR の URL をユーザーに伝える。
