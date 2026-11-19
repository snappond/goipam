# GoIPAM (Lightweight Go-based IP Address Management)

phpIPAMのコア機能に焦点を絞ってトレースした、Go言語 + React SPA による軽量・高速・ポータブルなIPアドレス管理システムです。
Docker Composeでワンコマンド起動できます。

---

## 🌟 主な機能

1. **IPv4 サブネット管理 (フラット構造)**
   - CIDR（例: `192.168.1.0/24`）の登録と自動計算（ネットワーク・マスク・ブロードキャスト・総ホスト数）
   - サブネットごとの使用率・空きホスト数のリアルタイム可視化
   - 「最初の空きIP（First Available IP）」の自動検出・サジェスト

2. **IPアドレス台帳管理**
   - サブネット内のIP割り当て（ホスト名、MACアドレス、ステータス、所有部署、用途メモ）
   - ステータス管理（`Active`, `Reserved`, `DHCP`, `Offline`）

3. **PING死活確認 & ホスト自動探索 (Scanner Engine)**
   - **オンデマンド実行**:
     - 単一IPの即時Ping測定
     - サブネット登録済み全IPの一括死活確認（並行Ping）
     - 未登録ホストの自動探索（サブネット全域をPing走査）
   - **定期バックグラウンド監視**:
     - GoのGoroutineワーカープールがバックグラウンドで定期的に死活確認と探索を実行
   - **未登録ホストの検知 & ワンクリック登録**:
     - 応答のあった未登録IPを検知し、逆引きDNSやARPからホスト情報を取得してリスト化。ボタン1つで台帳に正式登録可能。

---

## 🏗 システム構成

- **フロントエンド**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Nginx
- **バックエンド**: Go 1.22+, Echo v4, GORM
- **データベース**: PostgreSQL 16
- **コンテナ基盤**: Docker / Docker Compose

---

## 🚀 クイックスタート

### 1. 起動
リポジトリ直下で以下のコマンドを実行します：

```bash
docker compose up -d --build
```

### 2. アクセス
ブラウザで以下にアクセスします：

- **Web UI**: [http://localhost:8080](http://localhost:8080)
- **API ヘルスチェック**: [http://localhost:8080/api/health](http://localhost:8080/api/health)

### 3. 停止
```bash
docker compose down
```
※ データを初期化したい場合は `docker compose down -v` を実行してください。

---

## 📂 ディレクトリ構成

```text
goipam/
├── docker-compose.yml              # DB, Backend, Frontend 統合定義
├── .env.example                    # 環境変数テンプレート
├── docs/                           # 設計ドキュメント一式
│   ├── 01_requirements/            # 要件定義書
│   ├── 02_architecture/            # システムアーキテクチャ設計書
│   ├── 03_database/                # DB物理設計書・ER図
│   ├── 04_api/                     # REST API仕様書
│   └── 05_scanner/                 # PING生存確認 & ホスト探索設計書
├── backend/                        # Go API サーバー & スキャナー
│   ├── Dockerfile
│   ├── main.go
│   ├── config/                     # 環境変数設定
│   ├── database/                   # DB接続 & マイグレーション
│   ├── models/                     # GORMエンティティ定義
│   ├── services/                   # CIDR計算 & 並行Pingスキャナー
│   └── handlers/                   # REST APIハンドラー
└── frontend/                       # React SPA
    ├── Dockerfile
    ├── nginx.conf                  # Nginx配信 & APIプロキシ
    ├── src/
    │   ├── api/                    # APIクライアント
    │   ├── components/             # UIコンポーネント群
    │   └── types/                  # 型定義
    └── package.json
```

---

## 📄 設計ドキュメント
詳細な設計仕様は `docs/` 配下を参照してください：
- [要件定義書](docs/01_requirements/requirements.md)
- [システムアーキテクチャ設計書](docs/02_architecture/architecture.md)
- [データベース物理設計書](docs/03_database/schema.md)
- [REST API仕様書](docs/04_api/api_specification.md)
- [PING生存確認 & ホスト探索設計書](docs/05_scanner/scanner_design.md)

