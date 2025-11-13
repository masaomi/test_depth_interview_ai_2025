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

## Option 2: Amazon Bedrockを使用する

Amazon Bedrockを使用してClaudeやその他のモデルを利用します。

### ステップ1: AWS認証情報の設定

```bash
# 1. AWS Consoleにログイン
# 2. IAMユーザーを作成
#    - IAM > ユーザー > ユーザーを作成
#    - プログラムによるアクセスを選択
# 3. ポリシーをアタッチ
#    - AmazonBedrockFullAccess（または以下のカスタムポリシー）
```

**カスタムポリシー例:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

### ステップ2: Bedrockモデルアクセスを有効化

```bash
# 1. AWS Console > Bedrock > Model access
# 2. 使用したいモデルのアクセスをリクエスト
# 3. Claudeモデルは通常即座に承認されます
```

### ステップ3: .envファイルを設定

```bash
# .env
LLM_PROVIDER=bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

### 利用可能なBedrockモデル

| モデルID | 説明 | 推奨用途 |
|---------|------|---------|
| `anthropic.claude-3-5-sonnet-20241022-v2:0` | Claude 3.5 Sonnet（最新・推奨） | 高品質な応答が必要な場合 |
| `anthropic.claude-3-sonnet-20240229-v1:0` | Claude 3 Sonnet | バランスの取れた性能 |
| `anthropic.claude-3-haiku-20240307-v1:0` | Claude 3 Haiku | 高速・低コスト |
| `amazon.titan-text-express-v1` | Amazon Titan Text Express | AWSネイティブモデル |
| `meta.llama3-70b-instruct-v1:0` | Meta Llama 3 70B | オープンソースモデル |

### Bedrockが利用可能なリージョン

- `us-east-1` (バージニア北部) - 推奨
- `us-west-2` (オレゴン)
- `ap-northeast-1` (東京)
- `ap-southeast-1` (シンガポール)
- `eu-central-1` (フランクフルト)

**注意**: モデルの可用性はリージョンによって異なります。最新情報はAWSドキュメントを確認してください。

---

## Option 3: ローカルLLMを使用する（Ollama）

ローカルでOllamaを使ってLLMを実行します。

### ステップ1: Ollamaのセットアップ

```bash
# Ollamaをインストール
# https://ollama.ai/ からダウンロード

# モデルをダウンロード
ollama pull llama2
# または、カスタムモデル (gpt-oss20B) をロード
```

### ステップ2: Ollamaサーバーを起動

```bash
# Ollamaサーバーを起動（まだ起動していない場合）
ollama serve

# または、モデルを直接実行（サーバーが自動起動します）
ollama run llama2

# インストール済みモデルを確認
ollama list

# APIエンドポイントをテスト
curl http://localhost:11434/v1/models
```

**注意**: macOS/Linuxでは、インストール後にOllamaが自動的にバックグラウンドサービスとして起動します。「Error: listen tcp 127.0.0.1:11434: bind: address already in use」というエラーが出た場合は、既にサーバーが起動しています。

### ステップ3: .envファイルを設定

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

### 便利なOllamaコマンド

```bash
# サーバーを起動（必要な場合）
ollama serve

# インストール済みモデルを一覧表示
ollama list

# 新しいモデルをダウンロード
ollama pull llama2
ollama pull mistral
ollama pull codellama

# モデルを対話的に実行
ollama run llama2

# モデルを削除
ollama rm llama2

# サーバーの状態を確認
curl http://localhost:11434/api/tags
```

---

## Option 4: ローカルLLMを使用する（LM Studio）

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

## Option 5: 他のローカルLLMサーバーを使用する

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
| `LLM_PROVIDER` | いいえ | - | `bedrock`でAmazon Bedrock、`local`でローカルLLMを使用 |
| `AWS_REGION` | はい※ | - | AWSリージョン（例：`us-east-1`）<br/>※ `LLM_PROVIDER=bedrock`の場合は必須 |
| `AWS_ACCESS_KEY_ID` | はい※ | - | AWSアクセスキーID<br/>※ `LLM_PROVIDER=bedrock`の場合は必須 |
| `AWS_SECRET_ACCESS_KEY` | はい※ | - | AWSシークレットアクセスキー<br/>※ `LLM_PROVIDER=bedrock`の場合は必須 |
| `BEDROCK_MODEL_ID` | いいえ | `anthropic.claude-3-5-sonnet-20241022-v2:0` | 使用するBedrockモデルID |
| `LOCAL_LLM_BASE_URL` | はい※ | - | ローカルLLMサーバーのベースURL<br/>※ `LLM_PROVIDER=local`の場合は必須 |
| `LOCAL_LLM_MODEL` | いいえ | `gpt-oss20B` | 使用するモデル名 |
| `LOCAL_LLM_API_KEY` | いいえ | `dummy` | APIキー（サーバーが要求する場合） |
| `OPENAI_API_KEY` | はい※ | - | OpenAI APIキー<br/>※ Bedrock/ローカルLLMを使わない場合は必須 |
| `OPENAI_MODEL` | いいえ | `gpt-4` | 使用するOpenAIモデル |

---

## 設定の優先順位

システムは以下の優先順位でLLMプロバイダーを選択します：

1. **`LLM_PROVIDER=bedrock`が設定されている場合**
   → Amazon Bedrockを使用（AWS認証情報が必要）

2. **`LLM_PROVIDER=local`が設定されている場合**
   → ローカルLLMを使用（`OPENAI_API_KEY`は無視される）

3. **`LLM_PROVIDER`が設定されていない場合**
   → OpenAI APIを使用（`OPENAI_API_KEY`が必要）

---

## プロバイダーの切り替え方法

### OpenAI → Amazon Bedrock に切り替え

`.env`ファイルを以下のように変更：
```bash
LLM_PROVIDER=bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

### OpenAI → ローカルLLM に切り替え

`.env`ファイルに以下を追加：
```bash
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=gpt-oss20B
```

### Bedrock/ローカルLLM → OpenAI に切り替え

`.env`ファイルから以下を削除またはコメントアウト：
```bash
# LLM_PROVIDER=bedrock
# LLM_PROVIDER=local
# (その他のプロバイダー固有の設定)
```

`OPENAI_API_KEY`が設定されていることを確認。

---

## トラブルシューティング

### エラー: "AWS credentials are required for Bedrock"

- `LLM_PROVIDER=bedrock`を設定している場合、以下の環境変数が必須です：
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- AWS認証情報が正しいか確認してください
- IAMユーザーに`bedrock:InvokeModel`権限があるか確認してください

### エラー: "LOCAL_LLM_BASE_URL environment variable is not set"

- `LLM_PROVIDER=local`を設定している場合は、`LOCAL_LLM_BASE_URL`も必須です
- ローカルLLMサーバーが起動しているか確認してください

### エラー: "OPENAI_API_KEY environment variable is not set"

- Amazon Bedrockを使いたい場合は、`LLM_PROVIDER=bedrock`を設定してください
- ローカルLLMを使いたい場合は、`LLM_PROVIDER=local`を設定してください
- OpenAIを使いたい場合は、有効な`OPENAI_API_KEY`を設定してください

### Bedrockに接続できない

- AWS認証情報が正しいか確認:
  ```bash
  aws bedrock list-foundation-models --region us-east-1
  # AWS CLIが設定されている場合
  ```
- IAMポリシーに`bedrock:InvokeModel`権限があるか確認
- Bedrock Model Accessで使用するモデルが有効化されているか確認
- リージョンが正しいか確認（全リージョンでBedrockが利用可能とは限りません）
- モデルIDが正確か確認（大文字小文字を含め完全一致が必要）

### ローカルLLMに接続できない

- ローカルサーバーが起動しているか確認:
  ```bash
  # Ollamaの場合
  curl http://localhost:11434/v1/models
  
  # LM Studioの場合
  curl http://localhost:1234/v1/models
  ```
- ポート番号が正しいか確認
- `/v1`パスが含まれているか確認（OpenAI互換API用）
- Ollamaの場合、サーバーを手動で起動してみる: `ollama serve`

### Ollamaサーバーが起動しない

```bash
# 既に起動しているか確認
ps aux | grep ollama

# ポートを確認
lsof -i :11434

# アドレスが既に使用中の場合、サーバーは起動しています
# そのまま使用してください

# 強制再起動（macOS）
brew services restart ollama

# または、プロセスを終了して再起動
pkill ollama
ollama serve
```

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

---

## Ollamaのクイックスタート（macOS）

```bash
# 1. Ollamaをインストール
brew install ollama

# 2. Ollamaを起動（自動起動していない場合）
ollama serve

# 3. モデルをダウンロード（別のターミナルで）
ollama pull llama2

# 4. テスト
ollama run llama2
# "Hello"と入力して応答を確認
# Ctrl+Dで終了

# 5. .envファイルを設定
cat > .env << 'EOF'
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=llama2
EOF

# 6. アプリケーションを起動
pnpm dev
```

---

## Ollamaのおすすめモデル

| モデル | サイズ | 速度 | 品質 | 用途 |
|--------|--------|------|------|------|
| `llama2` | 7B | 速い | 良い | 汎用、クイックレスポンス |
| `llama2:13b` | 13B | 中程度 | より良い | 高品質、やや遅い |
| `mistral` | 7B | 速い | 優秀 | 速度と品質のバランスが良い |
| `codellama` | 7B | 速い | 良い | コード関連タスク |
| `gemma:7b` | 7B | 速い | 良い | Googleのモデル |

ダウンロード: `ollama pull <モデル名>`

