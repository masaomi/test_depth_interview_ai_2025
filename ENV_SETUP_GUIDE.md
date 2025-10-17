# Environment Variables Setup Guide

このガイドでは、AI Interview Systemで使用する環境変数の設定方法を説明します。

## Quick Start

プロジェクトルートに `.env` ファイルを作成し、以下のいずれかの設定をコピーしてください。

---

## Option 1: OpenAI API を使用する（デフォルト）

最もシンプルな設定です。OpenAIのGPT-4を使用します。

```bash
# .env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

オプション: モデルを変更する場合
```bash
# .env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo  # or gpt-3.5-turbo, etc.
```

---

## Option 2: ローカルLLMを使用する（Ollama）

ローカルでOllamaを使ってLLMを実行します。

### ステップ1: Ollamaのセットアップ

```bash
# Ollamaをインストール
# https://ollama.ai/ からダウンロード

# モデルを準備
ollama pull llama2
# または、カスタムモデル (gpt-oss20B) をロード
```

### ステップ2: .envファイルを設定

```bash
# .env
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=llama2
```

カスタムモデル（gpt-oss20B）を使う場合:
```bash
# .env
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=gpt-oss20B
```

---

## Option 3: ローカルLLMを使用する（LM Studio）

LM Studioを使ってローカルでLLMを実行します。

### ステップ1: LM Studioのセットアップ

1. LM Studio をインストール (https://lmstudio.ai/)
2. モデルをダウンロード＆ロード
3. ローカルサーバーを起動（通常はポート1234）

### ステップ2: .envファイルを設定

```bash
# .env
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:1234/v1
LOCAL_LLM_MODEL=gpt-oss20B
```

---

## Option 4: 他のローカルLLMサーバーを使用する

vLLM、text-generation-webui、その他のOpenAI互換APIサーバーも使用できます。

```bash
# .env
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://your-server:port/v1
LOCAL_LLM_MODEL=your-model-name
LOCAL_LLM_API_KEY=your-api-key-if-needed  # 必要な場合のみ
```

---

## 環境変数の説明

| 変数名 | 必須 | デフォルト値 | 説明 |
|--------|------|--------------|------|
| `LLM_PROVIDER` | いいえ | - | `local`に設定するとローカルLLMを使用 |
| `LOCAL_LLM_BASE_URL` | はい※ | - | ローカルLLMサーバーのベースURL<br/>※ `LLM_PROVIDER=local`の場合は必須 |
| `LOCAL_LLM_MODEL` | いいえ | `gpt-oss20B` | 使用するモデル名 |
| `LOCAL_LLM_API_KEY` | いいえ | `dummy` | APIキー（サーバーが要求する場合） |
| `OPENAI_API_KEY` | はい※ | - | OpenAI APIキー<br/>※ ローカルLLMを使わない場合は必須 |
| `OPENAI_MODEL` | いいえ | `gpt-4` | 使用するOpenAIモデル |

---

## 設定の優先順位

システムは以下の優先順位でLLMプロバイダーを選択します：

1. **`LLM_PROVIDER=local`が設定されている場合**
   → ローカルLLMを使用（`OPENAI_API_KEY`は無視される）

2. **`LLM_PROVIDER=local`が設定されていない場合**
   → OpenAI APIを使用（`OPENAI_API_KEY`が必要）

---

## プロバイダーの切り替え方法

### OpenAI → ローカルLLM に切り替え

`.env`ファイルに以下を追加：
```bash
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=gpt-oss20B
```

### ローカルLLM → OpenAI に切り替え

`.env`ファイルから以下を削除またはコメントアウト：
```bash
# LLM_PROVIDER=local
# LOCAL_LLM_BASE_URL=http://localhost:11434/v1
# LOCAL_LLM_MODEL=gpt-oss20B
```

`OPENAI_API_KEY`が設定されていることを確認。

---

## トラブルシューティング

### エラー: "LOCAL_LLM_BASE_URL environment variable is not set"

- `LLM_PROVIDER=local`を設定している場合は、`LOCAL_LLM_BASE_URL`も必須です
- ローカルLLMサーバーが起動しているか確認してください

### エラー: "OPENAI_API_KEY environment variable is not set"

- ローカルLLMを使いたい場合は、`LLM_PROVIDER=local`を設定してください
- OpenAIを使いたい場合は、有効な`OPENAI_API_KEY`を設定してください

### ローカルLLMに接続できない

- ローカルサーバーが起動しているか確認: `curl http://localhost:11434/v1/models`
- ポート番号が正しいか確認
- `/v1`パスが含まれているか確認（OpenAI互換API用）

---

## .env ファイルのサンプル

### 完全な設定例

```bash
# .env

# ========================================
# LLM Provider Configuration
# ========================================
# Priority: LLM_PROVIDER=local > OPENAI_API_KEY

# Option 1: Use OpenAI (comment out LLM_PROVIDER)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OPENAI_MODEL=gpt-4  # Optional

# Option 2: Use Local LLM (uncomment below)
# LLM_PROVIDER=local
# LOCAL_LLM_BASE_URL=http://localhost:11434/v1  # Ollama
# LOCAL_LLM_MODEL=gpt-oss20B
# LOCAL_LLM_API_KEY=dummy  # Optional
```

このファイルをコピーして、必要な設定のコメントを解除してください。

