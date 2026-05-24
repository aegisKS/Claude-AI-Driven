# AI チャットボット 実装 TODO リスト

## 現在の状態
- [x] `ai-chat` ディレクトリ作成
- [x] `CLAUDE.md` 仕様書作成
- [x] Next.js プロジェクト初期化（App Router + TypeScript）
- [x] パッケージインストール（hono / prisma / @prisma/client / @mastra/core / @mastra/memory / @ai-sdk/anthropic / ai / dotenv）
- [x] Prisma 初期化（MongoDB）
- [x] ディレクトリ構造作成（lib/mastra / lib/db）

---

## Phase 1: 設定・基盤構築 ✅

- [x] **Prisma スキーマ定義** (`prisma/schema.prisma`)
- [x] **環境変数設定** (`.env`)
- [x] **`.env.example` 作成**
- [x] **`.gitignore` 確認・修正**
- [x] **Prisma クライアント生成**
- [x] **Prisma クライアント設定** (`lib/prisma.ts`)

---

## Phase 2: バックエンド実装 ✅

- [x] **会話履歴 DB 操作** (`lib/db/conversation.ts`)
- [x] **Mastra メイドエージェント設定** (`lib/mastra/agent.ts`)
- [x] **Hono API ルーター** (`app/api/[[...route]]/route.ts`)
  - `POST /api/chat`
  - `GET /api/history/:conversationId`
  - `DELETE /api/history/:conversationId`

---

## Phase 3: フロントエンド実装 ✅

- [x] **グローバルスタイル設定** (`app/globals.css`)
- [x] **型定義** (`types/chat.ts`)
- [x] **キャラクターアイコン** (`public/maid-avatar.svg`)
- [x] **チャット画面 UI** (`app/page.tsx`)
- [x] **レイアウト更新** (`app/layout.tsx`)

---

## Phase 4: デプロイ準備 ✅

- [x] **Dockerfile 作成**
- [x] **`next.config.ts` 更新**（standalone 出力）

---

## Phase 5: 品質確認 ← 次のステップ

- [ ] **`.env` に実際の値を設定する**（MongoDB URL・API キー）
- [ ] チャット送受信の動作確認（`npm run dev` で起動）
- [ ] 会話履歴の保存・取得確認
- [ ] キャラクター口調の確認
- [ ] Cloud Run でのデプロイ確認

---

## Phase 6: エラーハンドリング ✅

### API (`app/api/[[...route]]/route.ts`)
- [x] `POST /api/chat` — 空メッセージ・長すぎる入力のバリデーション追加
- [x] `POST /api/chat` — SSE ストリーム内の try-catch 追加（`result.textStream` 反復処理）
- [x] `POST /api/chat` — `saveMessage()` 失敗時のエラー処理
- [x] `GET /api/history/:conversationId` — MongoDB ObjectId 形式バリデーション
- [x] `DELETE /api/history/:conversationId` — try-catch 追加、失敗時も `{ success: false }` を返す

### フロントエンド (`app/page.tsx`)
- [x] `fetch()` 後に `res.ok` チェックを追加（非200レスポンスの検知）
- [x] `JSON.parse(data)` に try-catch 追加（SSE データ破損対策）
- [x] 履歴取得失敗時のユーザー通知（`notice` ステートで画面表示）
- [x] messages 配列が空の状態でエラー発生した場合の undefined アクセス防止

### データベース (`lib/db/conversation.ts`)
- [x] 全 DB 操作に try-catch 追加（Prisma エラーの適切な伝播）
- [x] `deleteConversation()` をトランザクション化（messages と conversation の削除を原子的に実行）
- [x] `saveMessage()` のメッセージ内容バリデーション（空文字・長さ上限 10000 文字）

---

## Phase 7: 型安全・スキーマ改善 ✅

### Prisma スキーマ (`prisma/schema.prisma`)
- [x] `role` フィールドを `String` から `enum Role` に変更（`"user" | "assistant"` を DB レベルで強制）
- [x] `Message.conversationId` にインデックス追加（クエリ性能向上）
- [x] `Message` リレーションに `onDelete: Cascade` 追加（スキーマレベルの整合性保証）

### 型定義 (`types/chat.ts`)
- [x] `Message.createdAt` は `string`（ISO形式）で統一済み — 変更不要
- [x] `role` フィールドは `"user" | "assistant"` リテラル型 — 変更不要

---

## Phase 8: Mastra エージェント統合 ✅

- [x] `SYSTEM_PROMPT` を `lib/mastra/agent.ts` に一元化し `export` — `route.ts` からインポートするよう変更
- [x] `maidAgent` を `agent.ts` で定義・エクスポート（将来の Mastra 統合に向けて保持）

---

## Phase 9: 本番運用準備 ✅

### package.json
- [x] Prisma 自動生成スクリプト追加（`"postinstall": "prisma generate"`）
- [x] DB マイグレーションスクリプト追加（`"migrate": "prisma migrate deploy"`）

### Dockerfile
- [x] 起動時の必須環境変数チェック追加（`DATABASE_URL`・`ANTHROPIC_API_KEY` 未設定で即時終了）
- [x] `HEALTHCHECK` 命令追加（Cloud Run のヘルスチェック対応）
