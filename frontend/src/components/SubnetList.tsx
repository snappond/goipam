import React from 'react';
import { Subnet } from '../types';
import { Network, ChevronRight, Trash2, Activity, Radio } from 'lucide-react';
import { deleteSubnet } from '../api/client';

interface SubnetListProps {
  subnets: Subnet[];
  onSelectSubnet: (subnet: Subnet) => void;
  onRefresh: () => void;
}

export const SubnetList: React.FC<SubnetListProps> = ({
  subnets,
  onSelectSubnet,
  onRefresh,
}) => {
  const handleDelete = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (!confirm(`サブネット「${name}」および配下のIPアドレスをすべて削除しますか？`)) {
      return;
    }
    try {
      await deleteSubnet(id);
      onRefresh();
    } catch {
      alert('削除に失敗しました');
    }
  };

  if (subnets.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
        <Network className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800">サブネットがまだ登録されていません</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          右上の「サブネット作成」ボタンをクリックして、管理対象のIPv4サブネット（例: 192.168.1.0/24）を追加してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">管理サブネット一覧 ({subnets.length})</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subnets.map((subnet) => (
          <div
            key={subnet.id}
            onClick={() => onSelectSubnet(subnet)}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              {/* ヘッダー */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                    {subnet.cidr}
                  </span>
                  {subnet.vlan_id && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded border border-indigo-200">
                      VLAN {subnet.vlan_id}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => handleDelete(e, subnet.id, subnet.name)}
                  className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* サブネット名 & 説明 */}
              <h3 className="font-semibold text-sm text-slate-800 mb-1">{subnet.name}</h3>
              {subnet.description && (
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{subnet.description}</p>
              )}

              {/* スキャン設定バッジ & DHCP範囲 */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mb-4">
                <span className={`inline-flex items-center space-x-1 ${subnet.scan_enabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <Activity className="w-3 h-3" />
                  <span>{subnet.scan_enabled ? '定期Ping' : 'Ping無効'}</span>
                </span>
                <span>•</span>
                <span className={`inline-flex items-center space-x-1 ${subnet.discover_enabled ? 'text-blue-700' : 'text-slate-400'}`}>
                  <Radio className="w-3 h-3" />
                  <span>{subnet.discover_enabled ? '定期探索' : '探索無効'}</span>
                </span>
                {subnet.dhcp_start_ip && subnet.dhcp_end_ip && (
                  <>
                    <span>•</span>
                    <span className="bg-amber-50 text-amber-700 font-mono px-1.5 py-0.2 rounded border border-amber-200">
                      DHCP: {subnet.dhcp_start_ip}〜{subnet.dhcp_end_ip}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* フッター: 使用率バー */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-500">ホスト使用状況</span>
                <span className="font-mono font-semibold text-slate-800">
                  {subnet.used_hosts} / {subnet.total_hosts} ({subnet.usage_percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    subnet.usage_percentage > 90
                      ? 'bg-rose-500'
                      : subnet.usage_percentage > 70
                      ? 'bg-amber-500'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(subnet.usage_percentage, 100)}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-end text-xs text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
                <span>詳細・IP台帳を開く</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

