import React, { useState, useEffect } from 'react';
import { Subnet, IPAddress, DiscoveredHost, ScanStatusResult, DiscoveryResult } from '../types';
import {
  getIPAddresses,
  getDiscoveredHosts,
  deleteIPAddress,
  pingSingleIP,
  scanSubnetStatus,
  discoverSubnet,
} from '../api/client';
import { DiscoveredHostsTable } from './DiscoveredHostsTable';
import {
  ArrowLeft,
  Plus,
  Activity,
  Radio,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trash2,
  Globe,
  Tag,
  Wifi,
  Sparkles,
  Settings,
} from 'lucide-react';
import { EditSubnetModal } from './EditSubnetModal';

interface SubnetDetailProps {
  subnet: Subnet;
  onBack: () => void;
  onOpenCreateIP: () => void;
  onSubnetUpdated: () => void;
}

export const SubnetDetail: React.FC<SubnetDetailProps> = ({
  subnet,
  onBack,
  onOpenCreateIP,
  onSubnetUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'addresses' | 'discovered'>('addresses');
  const [addresses, setAddresses] = useState<IPAddress[]>([]);
  const [discoveredHosts, setDiscoveredHosts] = useState<DiscoveredHost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanningStatus, setIsScanningStatus] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [pingingId, setPingingId] = useState<number | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [addrs, discs] = await Promise.all([
        getIPAddresses(subnet.id),
        getDiscoveredHosts(subnet.id),
      ]);
      setAddresses(addrs);
      setDiscoveredHosts(discs);
    } catch (err) {
      console.error('Failed to fetch subnet details', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subnet.id]);

  const handleDeleteIP = async (id: number) => {
    if (!confirm('このIPアドレスの登録を解除しますか？')) return;
    try {
      await deleteIPAddress(id);
      fetchData();
      onSubnetUpdated();
    } catch {
      alert('削除に失敗しました');
    }
  };

  const handlePingSingle = async (id: number) => {
    setPingingId(id);
    try {
      const res = await pingSingleIP(id);
      setAddresses((prev) =>
        prev.map((addr) =>
          addr.id === id
            ? {
                ...addr,
                alive_status: res.alive_status,
                last_seen: res.last_seen || addr.last_seen,
              }
            : addr
        )
      );
    } catch {
      alert('PING実行中にエラーが発生しました');
    } finally {
      setPingingId(null);
    }
  };

  const handleScanStatus = async () => {
    setIsScanningStatus(true);
    setScanMessage('登録済みIPの死活を確認中...');
    try {
      const res: ScanStatusResult = await scanSubnetStatus(subnet.id);
      setScanMessage(
        `死活確認完了: ${res.scanned_count}件中 ${res.online_count}台オンライン, ${res.offline_count}台オフライン (${res.elapsed_ms}ms)`
      );
      fetchData();
    } catch {
      setScanMessage('スキャンに失敗しました');
    } finally {
      setIsScanningStatus(false);
    }
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    setScanMessage('未登録ホストを探索中 (Ping全走査)...');
    try {
      const res: DiscoveryResult = await discoverSubnet(subnet.id);
      setScanMessage(
        `探索完了: ${res.total_tested}IPを走査し、新しく ${res.new_hosts_found}台のホストを発見しました (${res.elapsed_ms}ms)`
      );
      setActiveTab('discovered');
      fetchData();
    } catch {
      setScanMessage('探索に失敗しました');
    } finally {
      setIsDiscovering(false);
    }
  };

  const getAliveBadge = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Online</span>
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Offline</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            <span>Unknown</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-blue-50 text-blue-700 border-blue-200',
      reserved: 'bg-amber-50 text-amber-700 border-amber-200',
      dhcp: 'bg-purple-50 text-purple-700 border-purple-200',
      offline: 'bg-slate-50 text-slate-600 border-slate-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.active}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 戻るボタン & サブネット情報 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-slate-900">{subnet.name}</h2>
              <span className="font-mono text-sm px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 font-semibold">
                {subnet.cidr}
              </span>
              {subnet.vlan_id && (
                <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 font-medium">
                  VLAN {subnet.vlan_id}
                </span>
              )}
            </div>
            {subnet.description && <p className="text-xs text-slate-500 mt-1">{subnet.description}</p>}
          </div>
        </div>

        {/* アクションボタン群 */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-sm transition-colors"
            title="サブネット設定・DHCP範囲の編集"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>設定変更</span>
          </button>

          <button
            onClick={handleScanStatus}
            disabled={isScanningStatus || isDiscovering}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-sm transition-colors disabled:opacity-50"
            title="登録済みIPに一括Pingを送信して死活ステータスを更新"
          >
            <Activity className={`w-4 h-4 text-emerald-600 ${isScanningStatus ? 'animate-spin' : ''}`} />
            <span>{isScanningStatus ? 'Ping確認中...' : '即時死活確認'}</span>
          </button>

          <button
            onClick={handleDiscover}
            disabled={isScanningStatus || isDiscovering}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-sm transition-colors disabled:opacity-50"
            title="全利用可能範囲をPing走査し、未登録ホストを探索"
          >
            <Radio className={`w-4 h-4 text-blue-600 ${isDiscovering ? 'animate-pulse' : ''}`} />
            <span>{isDiscovering ? 'ホスト探索中...' : 'ホスト自動探索'}</span>
          </button>

          <button
            onClick={onOpenCreateIP}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>IPアドレス割り当て</span>
          </button>
        </div>
      </div>

      {/* スキャン実行結果バナー */}
      {scanMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>{scanMessage}</span>
          </div>
          <button
            onClick={() => setScanMessage(null)}
            className="text-blue-500 hover:text-blue-800 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* サブネット詳細スペックカード */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">ネットワーク</span>
            <span className="font-mono font-semibold text-slate-800">{subnet.network_address}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">サブネットマスク</span>
            <span className="font-mono font-semibold text-slate-800">{subnet.mask}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">ブロードキャスト</span>
            <span className="font-mono font-semibold text-slate-800">{subnet.broadcast_address}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">利用可能ホスト</span>
            <span className="font-mono font-semibold text-slate-800">{subnet.total_hosts} 台</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">使用率</span>
            <div className="flex items-center space-x-2 mt-0.5">
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(subnet.usage_percentage, 100)}%` }}
                />
              </div>
              <span className="font-mono font-semibold text-slate-800 whitespace-nowrap">
                {subnet.used_hosts}/{subnet.total_hosts} ({subnet.usage_percentage}%)
              </span>
            </div>
          </div>
        </div>

        {subnet.dhcp_start_ip && subnet.dhcp_end_ip && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-semibold rounded border border-amber-200">
                DHCP除外範囲
              </span>
              <span className="font-mono font-bold text-slate-700">
                {subnet.dhcp_start_ip} 〜 {subnet.dhcp_end_ip}
              </span>
            </div>
            <span className="text-slate-400 text-[11px]">
              ※この範囲のIPは自動探索・死活監視・空きIPサジェストから除外されています
            </span>
          </div>
        )}
      </div>

      {/* タブナビゲーション */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm">
        <button
          onClick={() => setActiveTab('addresses')}
          className={`pb-3 font-medium transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'addresses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>登録済みIPアドレス台帳 ({addresses.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('discovered')}
          className={`pb-3 font-medium transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'discovered'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-600" />
          <span>検出された未登録ホスト ({discoveredHosts.length})</span>
          {discoveredHosts.length > 0 && (
            <span className="bg-emerald-100 text-emerald-800 text-xs px-1.5 py-0.5 rounded-full font-bold">
              {discoveredHosts.length}
            </span>
          )}
        </button>
      </div>

      {/* コンテンツエリア */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent"></div>
          <p className="text-xs text-slate-500 mt-2">データを読み込み中...</p>
        </div>
      ) : activeTab === 'addresses' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {addresses.length === 0 ? (
            <div className="text-center py-12">
              <Wifi className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-slate-700">登録されているIPアドレスはありません</h4>
              <p className="text-xs text-slate-400 mt-1">「IPアドレス割り当て」からIPを追加してください。</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-6 py-3 font-semibold">IPアドレス</th>
                    <th className="px-6 py-3 font-semibold">死活状態</th>
                    <th className="px-6 py-3 font-semibold">管理ステータス</th>
                    <th className="px-6 py-3 font-semibold">ホスト名</th>
                    <th className="px-6 py-3 font-semibold">MACアドレス</th>
                    <th className="px-6 py-3 font-semibold">担当 / 用途</th>
                    <th className="px-6 py-3 font-semibold">最終確認</th>
                    <th className="px-6 py-3 font-semibold text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {addresses.map((addr) => (
                    <tr key={addr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 whitespace-nowrap font-mono font-bold text-slate-900">
                        {addr.ip_address}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">{getAliveBadge(addr.alive_status)}</td>
                      <td className="px-6 py-3.5 whitespace-nowrap">{getStatusBadge(addr.status)}</td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-600">
                        {addr.hostname ? (
                          <div className="flex items-center space-x-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            <span>{addr.hostname}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                        {addr.mac_address || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs">
                        <div className="text-slate-800 font-medium">{addr.owner || '-'}</div>
                        <div className="text-slate-400 truncate max-w-xs">{addr.description}</div>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-500">
                        {addr.last_seen ? new Date(addr.last_seen).toLocaleString('ja-JP') : '-'}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handlePingSingle(addr.id)}
                            disabled={pingingId === addr.id}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="即時Ping実行"
                          >
                            <Activity className={`w-4 h-4 ${pingingId === addr.id ? 'animate-spin text-emerald-600' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDeleteIP(addr.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="登録解除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <DiscoveredHostsTable hosts={discoveredHosts} onRefresh={fetchData} />
      )}
      {/* サブネット設定編集モーダル */}
      <EditSubnetModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          onSubnetUpdated();
          fetchData();
        }}
        subnet={subnet}
      />
    </div>
  );
};
