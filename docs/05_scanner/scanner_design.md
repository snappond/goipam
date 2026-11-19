# PING生存確認 & ホスト探索設計書 (Scanner & Discovery Engine)

## 1. 概要とphpIPAMとの比較

phpIPAMでは、外部Cronスクリプト（`pingCheck.php` および `discoveryCheck.php`）を定期実行し、外部コマンド（`fping` または `ping`）をフォークして死活監視や探索を行っています。

GoIPAMでは、**Go言語ネイティブの強力な並行処理（goroutine + チャネルによるワーカープール）**を活用し、外部Cronや外部バイナリに依存せず、バックエンドプロセス内で完結する超高速スキャンエンジンを実装します。

| 項目 | phpIPAM | GoIPAM |
| :--- | :--- | :--- |
| **実行形態** | 外部Cron (`crontab`) + PHP CLIスクリプト | Go内蔵のバックグラウンドゴルーチン + オンデマンドAPI |
| **スキャン方式** | `fping` または OS標準 `ping` コマンドをfork | Go ICMP / Raw Socket または 並行Pingワーカー |
| **並行性** | OSプロセスfork (高負荷) | 軽量Goroutine Worker Pool (極めて軽量・高速) |
| **スキャン速度 (/24)**| 5〜30秒 | 1〜3秒 |
| **MACアドレス取得** | SNMPまたはローカルARPテーブル | `/proc/net/arp` 参照 + ARP探索 (Linux環境時) |
| **逆引きDNS** | `gethostbyaddr` | `net.LookupAddr` による並行名前解決 |

---

## 2. スキャンアーキテクチャ

### 2.1 Goroutine ワーカープール
サブネット全体の探索（例: 254ホスト）を行う際、無制限にgoroutineを起動するとOSのファイルディスクリプタやソケットを圧迫するため、バッファ付きチャネルまたはセマフォを用いて**同時実行数（デフォルト: 32〜64並行）**を制限します。

```
[ スキャン対象IPキュー (例: 254件) ]
               │
               ▼
   ┌───────────────────────┐
   │ Worker Pool (Max: 32) │
   │ ┌────────┐ ┌────────┐ │
   │ │Worker 1│ │Worker 2│ │ ...
   │ └────┬───┘ └────┬───┘ │
   └──────┼──────────┼─────┘
          │          │ (ICMP Echo Request / Timeout: 800ms)
          ▼          ▼
     [ ターゲットホスト群 ]
          │          │
          ▼          ▼
     [ 結果集約チャネル ]
          │
          ├── 応答あり ─► DNS逆引き ─► ARPテーブル確認 ─► DB更新/検出テーブル追加
          └── タイムアウト ─► Offlineマーク
```

---

## 3. 2つの主要機能詳細

### 3.1 死活監視 (Status Check: `pingCheck`)
- **対象**: `ip_addresses` テーブルに登録されている全IP
- **除外対象**:
  - ステータスが `dhcp` のIPアドレス
  - サブネットのDHCP除外範囲（`dhcp_start_ip` 〜 `dhcp_end_ip`）に含まれるIPアドレス
- **目的**: 登録済みホストのオンライン/オフライン状態、および `last_seen` 日時の更新
- **判定ルール**:
  - ICMP応答あり:
    - `alive_status` = `online`
    - `last_seen` = `now()`
    - `last_checked` = `now()`
  - 応答なし (タイムアウト):
    - `alive_status` = `offline`
    - `last_checked` = `now()`

### 3.2 未登録ホスト探索 (Host Discovery: `discoveryCheck`)
- **対象**: サブネットの利用可能範囲（ネットワークアドレスとブロードキャストを除く全IP）
- **除外対象**:
  - 既に `ip_addresses` に登録されているIP
  - サブネットのDHCP除外範囲（`dhcp_start_ip` 〜 `dhcp_end_ip`）に含まれるIP（一時的接続クライアントの誤検知を防止）
- **判定ルール**:
  - ICMP応答があった場合:
    1. `net.LookupAddr(ip)` により逆引きホスト名を取得
    2. Linuxホストの場合、`/proc/net/arp` からMACアドレスを取得
    3. `discovered_hosts` テーブルへ登録（既に存在する場合は `discovered_at` と応答時間を更新）

---

## 4. コンテナ環境でのICMPとネットワーク考慮事項

Dockerコンテナ内からPingを送信する際の要件:

1. **非特権ICMPソケット (`ip_unprivileged_port_start`)**:
   - Docker Compose側で `sysctls: [ "net.ipv4.ping_group_range=0 2147483647" ]` および `cap_add: [ "NET_RAW" ]` を指定することで、非rootユーザーでも安全にICMP通信を可能にします。
2. **ARP検知についての注意**:
   - 通常のDockerブリッジネットワーク（仮想NAT）では、コンテナとホストの物理LANは別L2セグメントとなるため、物理LAN上のARPブロードキャストは直接受信できません（ただしICMP Pingへの応答はルーティング経由で届きます）。
   - ホストと完全に同一L2セグメントでARP検知を行いたい場合は、`docker-compose.yml` で `network_mode: "host"` を利用する構成もサポートします。

