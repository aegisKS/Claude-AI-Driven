# AI チャットボット仕様書

## プロジェクト概要

エンターテイメント目的の雑談・トーク相手チャットボット。
メイドキャラクターが明るく会話してくれるWebアプリ。

---

## キャラクター設定

| 項目 | 設定 |
|------|------|
| 名前 | なし（設定しない） |
| 性格 | 明るく元気な若い女性 |
| 一人称 | わたくし |
| ユーザーへの呼びかけ | ご主人様 |
| 語尾 | 〜なのです |
| スタイル | メイド調の丁寧でフレンドリーな口調 |

### システムプロンプト方針
- 常にメイドキャラクターとして振る舞う
- 明るくポジティブなトーンを維持する
- 雑談・日常会話を中心に対応する
- ご主人様を楽しませることを最優先にする

---

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js（App Router） |
| API | Hono |
| ORM | Prisma |
| データベース | MongoDB |
| AI エージェント | Mastra |
| AI モデル | Claude API（Anthropic） |
| デプロイ | Google Cloud Run |
| 言語 | TypeScript |

---

## アーキテクチャ

```
Next.js App Router
├── app/
│   ├── page.tsx              # チャット画面（UI）
│   ├── api/
│   │   └── [[...route]]/
│   │       └── route.ts      # Hono ルーター（API エンドポイント）
├── lib/
│   ├── mastra/               # Mastra エージェント設定
│   │   ├── agent.ts          # メイドキャラクター エージェント定義
│   │   └── index.ts
│   ├── prisma.ts             # Prisma クライアント
│   └── db/
│       └── conversation.ts   # 会話履歴 DB 操作
├── prisma/
│   └── schema.prisma         # MongoDB スキーマ定義
```

### API エンドポイント（Hono）

| メソッド | パス | 説明 |
|----------|------|------|
| POST | /api/chat | メッセージ送信・AI応答取得 |
| GET | /api/history | 会話履歴取得 |
| DELETE | /api/history | 会話履歴削除 |

---

## データモデル（MongoDB / Prisma）

### Conversation（会話セッション）
```prisma
model Conversation {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}
```

### Message（メッセージ）
```prisma
model Message {
  id             String       @id @default(auto()) @map("_id") @db.ObjectId
  conversationId String       @db.ObjectId
  role           String       # "user" | "assistant"
  content        String
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id])
}
```

---

## UI 仕様

- **レイアウト**: シンプルなチャット画面
- **レスポンシブ**: 不要（PC のみ）
- **ダークモード**: なし
- **キャラクターアイコン**: あり（メイドキャラクターのアバター画像を表示）
- **構成**:
  - 上部: キャラクターアイコン + キャラクター名表示エリア
  - 中部: メッセージ一覧（スクロール可能）
  - 下部: メッセージ入力フォーム + 送信ボタン

---

## 環境変数

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=

# MongoDB
DATABASE_URL=mongodb+srv://...

# アプリ設定
NEXT_PUBLIC_APP_URL=
```

---

## デプロイ（Google Cloud Run）

- コンテナイメージとしてビルド・デプロイ
- `Dockerfile` を用意する
- 環境変数は Cloud Run のシークレットマネージャーで管理
- ポート: `8080`（Cloud Run デフォルト）

---

## 開発ルール

- TypeScript を使用し、型安全を徹底する
- API レスポンスは必ず型定義を行う
- Mastra エージェントのシステムプロンプトは `lib/mastra/agent.ts` で一元管理する
- 会話履歴は MongoDB に永続化し、セッションをまたいでも参照可能にする
- コメントは原則不要。自明でない箇所のみ簡潔に記述する
