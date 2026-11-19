# システムアーキテクチャ設計書 (System Architecture)

## 1. システム構成概要

GoIPAMは、3つの主要コンテナ（PostgreSQL, Go Backend API + Scanner Worker, React SPA Frontend）から構成されるコンテナベースのマイクロサービスアーキテクチャを採用しています。

```
                    [ ユーザーのブラウザ ]
                              │
                    HTTP:80   │
                              ▼
        ┌───────────────────────────────────────────┐
        │       Frontend Container (Nginx)          │
        │  - React 18 + Vite + Tailwind CSS SPA     │
        │  - /api/* は Backend へリバースプロキシ     │
        └─────────────────────┬─────────────────────┘
                              │
                    HTTP:8080 │ (内部ネットワーク)
                              ▼
        ┌───────────────────────────────────────────┐
        │       Backend Container (Go / Echo)       │
        │  ┌─────────────────────────────────────┐  │
        │  │ REST API Handlers (Echo Framework)   │  │
        │  └──────────────────┬──────────────────┘  │
        │                     ▼                     │
        │  ┌─────────────────────────────────────┐  │
        │  │ IPAM Business Services & Calculations│ │
        │  └──────────────────┬──────────────────┘  │
        │                     ▼                     │
        │  ┌─────────────────────────────────────┐  │
        │  │ Background Scanner & Discovery      │  │
        │  │ (Goroutine Pool / ICMP Ping)         │  │
        │  └──────────────────┬──────────────────┘  │
        │                     ▼ (GORM)              │
        └─────────────────────┼─────────────────────┘
                              │
                    TCP:5432  │
                              ▼
        ┌───────────────────────────────────────────┐
        │       Database Container (PostgreSQL 16)  │
        │  - Volumeマウントによるデータ永続化          │
        └───────────────────────────────────────────┘
```

---

## 2. コンポーネント詳細

### 2.1 Backend (Go)
- **言語/バージョン**: Go 1.22+
- **フレームワーク**: Echo v4
- **ORM**: GORM (PostgreSQL Driver)
- **機能**:
  - **REST API**: フロントエンドからのリクエストを処理し、JSONでレスポンス。
  - **IPAM Calculation Engine**: CIDR解析（`net` パッケージ）、IP範囲計算、ネットマスク・ブロードキャスト計算、空きIP検出アルゴリズム。
  - **Scanner Worker Engine**:
    - オンデマンドPing（APIトリガー）
    - 定期実行バックグラウンドワーカー（goroutine + ticker）
    - 同時実行数を制御するワーカープール（セマフォ/バッファ付きチャネル）による高速ICMP Ping。
    - コンテナの `cap_add: [NET_RAW]` を利用した非特権ICMPソケット通信。

### 2.2 Frontend (React SPA)
- **ビルドツール**: Vite
- **UIライブラリ**: React 18 + TypeScript
- **スタイリング**: Tailwind CSS
- **アイコン**: Lucide React
- **HTTPクライアント**: Axios / Fetch API
- **Webサーバー**: Nginx Alpine（静的ファイル配信および `/api/` へのリバースプロキシ）

### 2.3 Database (PostgreSQL)
- **バージョン**: PostgreSQL 16 Alpine
- **永続化**: Dockerボリュームマウント (`postgres_data:/var/lib/postgresql/data`)
- **マイグレーション**: GORM AutoMigrate により起動時にスキーマを自動適用。

---

## 3. ネットワークとセキュリティ設計

### 3.1 Docker Network
- コンテナ間通信は専用のブリッジネットワーク (`goipam-network`) を介して実施。
- 外部公開ポート:
  - Frontend: `http://localhost:80` (または設定により `3000` / `8080`)
  - Backend (開発時デバッグ用): `http://localhost:8080` (本番時はNginxプロキシ経由で外部直接公開不要)
  - PostgreSQL: 内部ポート `5432` のみ（ホストへのポートバインドは任意）

### 3.2 ICMP Ping とコンテナ権限
- コンテナ内からICMP Pingを送信するため、Docker Composeにて以下を付与:
  ```yaml
  cap_add:
    - NET_RAW
  sysctls:
    - net.ipv4.ping_group_range=0 2147483647
  ```
  これにより、root以外のユーザーでも安全にICMPエコーリクエストを生成可能。

