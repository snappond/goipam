# REST API インターフェース仕様書 (API Specification)

## 1. 概要
- **ベースURL**: `/api`
- **データ形式**: JSON (`Content-Type: application/json`)
- **共通レスポンス構造**:
  - 成功時: 各リソースオブジェクト、または配列
  - エラー時:
    ```json
    {
      "error": "エラー内容のメッセージ"
    }
    ```

---

## 2. サブネット関連 (Subnets API)

### 2.1 サブネット一覧取得
- **Method / Path**: `GET /api/subnets`
- **Response (200 OK)**:
```json
[
  {
    "id": 1,
    "cidr": "192.168.1.0/24",
    "name": "オフィスLAN",
    "description": "第1執務室",
    "vlan_id": 10,
    "scan_enabled": true,
    "discover_enabled": true,
    "dhcp_start_ip": "192.168.1.100",
    "dhcp_end_ip": "192.168.1.200",
    "network_address": "192.168.1.0",
    "broadcast_address": "192.168.1.255",
    "mask": "255.255.255.0",
    "total_hosts": 254,
    "used_hosts": 42,
    "usage_percentage": 16.5,
    "created_at": "2026-11-19T10:00:00Z",
    "updated_at": "2026-11-19T10:00:00Z"
  }
]
```

### 2.2 サブネット作成
- **Method / Path**: `POST /api/subnets`
- **Request Body**:
```json
{
  "cidr": "192.168.1.0/24",
  "name": "オフィスLAN",
  "description": "第1執務室",
  "vlan_id": 10,
  "scan_enabled": true,
  "discover_enabled": true,
  "dhcp_start_ip": "192.168.1.100",
  "dhcp_end_ip": "192.168.1.200"
}
```
- **Response (201 Created)**: 作成されたサブネットオブジェクト (ネットワーク・マスク情報等自動計算)

### 2.3 サブネット詳細取得
- **Method / Path**: `GET /api/subnets/:id`
- **Response (200 OK)**: 単一サブネット情報 (使用率、空きIP数等含む)

### 2.4 サブネット更新
- **Method / Path**: `PUT /api/subnets/:id`
- **Request Body**:
```json
{
  "name": "新オフィスLAN",
  "description": "更新後の説明",
  "vlan_id": 20,
  "scan_enabled": true,
  "discover_enabled": false,
  "dhcp_start_ip": "192.168.1.100",
  "dhcp_end_ip": "192.168.1.200"
}
```
- **Response (200 OK)**: 更新後のサブネットオブジェクト

### 2.5 サブネット削除
- **Method / Path**: `DELETE /api/subnets/:id`
- **Response (204 No Content)**: 関連するIPアドレス・検出ホストもカスケード削除

### 2.6 最初に見つかった空きIP取得 (First Free IP)
- **Method / Path**: `GET /api/subnets/:id/first-free`
- **Response (200 OK)**:
```json
{
  "first_free_ip": "192.168.1.15"
}
```

---

## 3. スキャン & 探索 API (Scanner & Discovery API)

### 3.1 登録済みIPの即時死活確認 (Status Check)
- **Method / Path**: `POST /api/subnets/:id/scan-status`
- **説明**: サブネット内に登録されている全IPに対して並行Pingを実行し、死活ステータスと最終確認日時を更新します。
- **Response (200 OK)**:
```json
{
  "scanned_count": 42,
  "online_count": 35,
  "offline_count": 7,
  "elapsed_ms": 1240
}
```

### 3.2 未登録ホストの即時自動探索 (Host Discovery)
- **Method / Path**: `POST /api/subnets/:id/discover`
- **説明**: サブネット内の利用可能全範囲（例: 192.168.1.1〜254）に並行Pingを送信し、未登録で応答のあったホストを `discovered_hosts` に記録します。
- **Response (200 OK)**:
```json
{
  "total_tested": 254,
  "new_hosts_found": 3,
  "elapsed_ms": 2850
}
```

---

## 4. IPアドレス関連 (IP Addresses API)

### 4.1 サブネット内登録IP一覧取得
- **Method / Path**: `GET /api/subnets/:id/addresses`
- **Response (200 OK)**:
```json
[
  {
    "id": 1,
    "subnet_id": 1,
    "ip_address": "192.168.1.1",
    "status": "active",
    "alive_status": "online",
    "hostname": "gateway.local",
    "mac_address": "AA:BB:CC:DD:EE:01",
    "description": "デフォルトゲートウェイ",
    "owner": "インフラチーム",
    "last_seen": "2026-11-19T10:30:00Z",
    "last_checked": "2026-11-19T10:30:00Z"
  }
]
```

### 4.2 IPアドレス登録
- **Method / Path**: `POST /api/subnets/:id/addresses`
- **Request Body**:
```json
{
  "ip_address": "192.168.1.50",
  "status": "active",
  "hostname": "web01.internal",
  "mac_address": "00:11:22:33:44:55",
  "description": "Webサーバー主系",
  "owner": "開発部"
}
```
- **Response (201 Created)**: 登録されたIPアドレスオブジェクト

### 4.3 IPアドレス詳細更新
- **Method / Path**: `PUT /api/addresses/:id`
- **Response (200 OK)**: 更新されたIPアドレスオブジェクト

### 4.4 IPアドレス削除
- **Method / Path**: `DELETE /api/addresses/:id`
- **Response (204 No Content)**

### 4.5 単一IPへのオンデマンドPing
- **Method / Path**: `POST /api/addresses/:id/ping`
- **Response (200 OK)**:
```json
{
  "ip_address": "192.168.1.50",
  "alive_status": "online",
  "response_time_ms": 1.25,
  "last_seen": "2026-11-19T10:45:00Z"
}
```

---

## 5. 検出ホスト候補関連 (Discovered Hosts API)

### 5.1 サブネット内検出ホスト一覧取得
- **Method / Path**: `GET /api/subnets/:id/discovered`
- **Response (200 OK)**:
```json
[
  {
    "id": 5,
    "subnet_id": 1,
    "ip_address": "192.168.1.88",
    "mac_address": "52:54:00:12:34:56",
    "hostname": "printer-floor2.local",
    "response_time_ms": 3.8,
    "status": "pending",
    "discovered_at": "2026-11-19T10:35:00Z"
  }
]
```

### 5.2 検出ホストを正式登録
- **Method / Path**: `POST /api/discovered/:id/register`
- **Request Body (任意補完)**:
```json
{
  "status": "active",
  "hostname": "printer-floor2.local",
  "description": "2Fフロアプリンター",
  "owner": "総務部"
}
```
- **Response (201 Created)**: 正式登録された `ip_addresses` オブジェクト（`discovered_hosts` 側のステータスは `registered` に遷移）

### 5.3 検出ホストを無視/削除
- **Method / Path**: `DELETE /api/discovered/:id`
- **Response (204 No Content)**

