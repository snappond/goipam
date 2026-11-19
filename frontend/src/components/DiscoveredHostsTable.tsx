import React, { useState } from 'react';
import { DiscoveredHost } from '../types';
import { registerDiscoveredHost, deleteDiscoveredHost } from '../api/client';
import { Radio, Check, Trash2, Clock, Globe } from 'lucide-react';

interface DiscoveredHostsTableProps {
  hosts: DiscoveredHost[];
  onRefresh: () => void;
}

export const DiscoveredHostsTable: React.FC<DiscoveredHostsTableProps> = ({
  hosts,
  onRefresh,
}) => {
  const [processingId, setProcessingId] = useState<number | null>(null);

  const handleRegister = async (host: DiscoveredHost) => {
    setProcessingId(host.id);
    try {
      await registerDiscoveredHost(host.id, {
        status: 'active',
        hostname: host.hostname,
        description: '自動探索により検出され登録',
      });
      onRefresh();
    } catch (err) {
      alert('登録に失敗しました');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('この検出候補を一覧から削除（無視）しますか？')) return;
    setProcessingId(id);
    try {
      await deleteDiscoveredHost(id);
      onRefresh();
    } catch (err) {
      alert('削除に失敗しました');
    } finally {
      setProcessingId(null);
    }
  };

  if (hosts.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
        <Radio className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 className="text-base font-semibold text-slate-700">未登録の生存ホストはありません</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          「ホスト自動探索」を実行すると、サブネット内をPingスキャンし、未登録で応答のあった機器がここにリストアップされます。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-800">
            検出された未登録ホスト ({hosts.length}件)
          </h3>
        </div>
        <span className="text-xs text-slate-500">
          ワンクリックでIPアドレス管理台帳に正式追加できます
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider text-left">
            <tr>
              <th className="px-6 py-3 font-semibold">IPアドレス</th>
              <th className="px-6 py-3 font-semibold">逆引きホスト名</th>
              <th className="px-6 py-3 font-semibold">MACアドレス</th>
              <th className="px-6 py-3 font-semibold">Ping応答</th>
              <th className="px-6 py-3 font-semibold">検出日時</th>
              <th className="px-6 py-3 font-semibold text-right">アクション</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {hosts.map((host) => (
              <tr key={host.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3.5 whitespace-nowrap font-mono font-medium text-slate-900">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{host.ip_address}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap text-slate-600">
                  {host.hostname ? (
                    <div className="flex items-center space-x-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>{host.hostname}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                  {host.mac_address || <span className="text-slate-400">-</span>}
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-600">
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono font-medium border border-emerald-200">
                    {host.response_time_ms.toFixed(1)} ms
                  </span>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(host.discovered_at).toLocaleString('ja-JP')}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleRegister(host)}
                      disabled={processingId === host.id}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>正式登録</span>
                    </button>
                    <button
                      onClick={() => handleDelete(host.id)}
                      disabled={processingId === host.id}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="無視して削除"
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
    </div>
  );
};

