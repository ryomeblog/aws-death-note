# AWS Death Note - CDK Project

AWS CDKを使用してAppSync GraphQL APIとBasic認証付き静的サイトをデプロイするプロジェクトです。

## 概要

このプロジェクトは以下の AWS リソースを構築します：

- **AppSync GraphQL API**: シンプルなhelloクエリを提供
- **S3バケット**: 静的サイトホスティング用
- **CloudFront**: CDN配信とBasic認証機能
- **CloudFront Function**: Basic認証の実装

## アーキテクチャ

```
[ユーザー] → [CloudFront + Basic認証] → [S3バケット (静的サイト)]
                                    ↓
                           [AppSync GraphQL API]
```

## 前提条件

- Node.js (v16以上推奨)
- AWS CLI設定済み
- AWS CDK CLI インストール済み (`npm install -g aws-cdk`)

## セットアップ

1. 依存関係のインストール:
   ```bash
   npm install
   ```

2. TypeScriptのコンパイル:
   ```bash
   npm run build
   ```

3. CDKのブートストラップ（初回のみ）:
   ```bash
   npx cdk bootstrap
   ```

## デプロイ

スタックをAWSにデプロイ:
```bash
npx cdk deploy
```

デプロイ後、出力値として以下の情報が表示されます：
- GraphQL API URL
- GraphQL API Key
- CloudFront Domain Name
- S3 Bucket Name
- 静的サイトURL

## Basic認証情報

静的サイトにアクセスする際のBasic認証情報：
- **ユーザー名**: `admin`
- **パスワード**: `password123`

認証情報は [`functions/basic-auth.js`](functions/basic-auth.js) で設定されています。

## プロジェクト構成

```
├── bin/
│   └── aws-death-note.ts          # CDKアプリのエントリーポイント
├── lib/
│   └── aws-death-note-stack.ts    # メインスタック定義
├── schema/
│   └── schema.graphql             # GraphQLスキーマ定義
├── resolvers/
│   └── Query.hello.js             # GraphQLリゾルバー
├── functions/
│   └── basic-auth.js              # CloudFront Function (Basic認証)
├── static/
│   ├── index.html                 # 静的サイトのメインページ
│   └── error.html                 # エラーページ
└── README.md
```

## GraphQL API

### スキーマ
```graphql
type Query {
  hello: String
}
```

### クエリ例
```graphql
query {
  hello
}
```

レスポンス:
```json
{
  "data": {
    "hello": "Hello from AWS AppSync!"
  }
}
```

## 有用なコマンド

- `npm run build` - TypeScriptをJavaScriptにコンパイル
- `npm run watch` - ファイル変更を監視してコンパイル
- `npm run test` - Jestユニットテストを実行
- `npx cdk deploy` - スタックをAWSアカウント/リージョンにデプロイ
- `npx cdk diff` - デプロイ済みスタックと現在の状態を比較
- `npx cdk synth` - 合成されたCloudFormationテンプレートを出力
- `npx cdk destroy` - スタックを削除

## セキュリティ機能

- S3バケットへの直接アクセスをブロック
- CloudFront経由のアクセスのみ許可
- Origin Access Control (OAC) による安全なアクセス制御
- CloudFront Functionによるエッジでの認証処理

## カスタマイズ

### Basic認証情報の変更
[`functions/basic-auth.js`](functions/basic-auth.js:5-6) でユーザー名とパスワードを変更できます：

```javascript
const USERNAME = 'your-username';
const PASSWORD = 'your-password';
```

### GraphQLスキーマの拡張
[`schema/schema.graphql`](schema/schema.graphql) でスキーマを拡張し、対応するリゾルバーを [`resolvers/`](resolvers/) ディレクトリに追加してください。

## 削除ポリシー

このプロジェクトでは、開発環境での使用を想定して以下のリソースに `DESTROY` 削除ポリシーが設定されています：
- AppSync API
- CloudFront Function
- S3バケット（オブジェクト自動削除有効）

本番環境では適切な削除ポリシーに変更することを推奨します。

## ライセンス

MIT License
