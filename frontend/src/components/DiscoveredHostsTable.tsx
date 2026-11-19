import React, { useState } from 'react';
import { DiscoveredHost } from '../types';
import {
  registerDiscoveredHost,
  deleteDiscoveredHost,
  batchDeleteDiscoveredHosts,
  clearDiscoveredHosts,
} from '../api/client';
import { Radio, Check, Trash2, Clock, Globe, CheckSquare, Square, XCircle } from 'lucide-react';

interface DiscoveredHostsTableProps {
  subnetId: number;
  hosts: DiscoveredHost[];
  onRefresh: () => void;
}

export const DiscoveredHostsTable: React.FC<DiscoveredHostsTableProps> = ({
  subnetId,
  hosts,
  onRefresh,
}) => {
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const handleToggleSelectAll = () => {
    if (selectedIds.size === hosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(hosts.map((h) => h.id)));
    }
  };

  const handleToggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`選択した ${selectedIds.size} 件の検出ホストを削除（無視）しますか？`)) {
      return;
    }

    setIsBatchProcessing(true);
    try {
      await batchDeleteDiscoveredHosts(Array.from(selectedIds));
      setSelectedIds(new Set());
      onRefresh();
    } catch {
      alert('一括削除に失敗しました');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`サブネット内の検出された未登録ホスト（全${hosts.length}件）をすべてクリアしますか？`)) {
      return;
    }

    setIsBatchProcessing(true);
    try {
      await clearDiscoveredHosts(subnetId);
      setSelectedIds(new Set());
      onRefresh();
    } catch {
      alert('全件クリアに失敗しました');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleRegister = async (host: DiscoveredHost) => {
    setProcessingId(host.id);
    try {
      await registerDiscoveredHost(host.id, {
        status: 'active',
        hostname: host.hostname,
        description: '自動探索により検出され登録',
      });
      // 選択中リストから除外
      const next = new Set(selectedIds);
      next.delete(host.id);
      setSelectedIds(next);
      onRefresh();
    } catch {
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
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
      onRefresh();
    } catch {
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

  const isAllSelected = hosts.length > 0 && selectedIds.size === hosts.length;

  return (
    <div className="space-y-3">
      {/* 操作バー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleSelectAll}
            className="flex items-center space-x-1.5 font-medium text-slate-700 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
          >
            {isAllSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>{isAllSelected ? '選択全解除' : 'すべて選択'}</span>
          </button>

          {selectedIds.size > 0 && (
            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {selectedIds.size} 件選択中
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBatchDelete}
              disabled={isBatchProcessing}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg border border-rose-200 transition-colors shadow-sm disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>選択した {selectedIds.size} 件を削除</span>
            </button>
          )}

          <button
            onClick={handleClearAll}
            disabled={isBatchProcessing}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-rose-600 font-medium rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            title="未登録ホスト一覧をすべて空にします"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>全件クリア</span>
          </button>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider text-left">
              <tr>
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 font-semibold">IPアドレス</th>
                <th className="px-6 py-3 font-semibold">逆引きホスト名</th>
                <th className="px-6 py-3 font-semibold">MACアドレス</th>
                <th className="px-6 py-3 font-semibold">Ping応答</th>
                <th className="px-6 py-3 font-semibold">最終検出日時</th>
                <th className="px-6 py-3 font-semibold text-right">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {hosts.map((host) => {
                const isSelected = selectedIds.has(host.id);
                return (
                  <tr
                    key={host.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="w-10 px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(host.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
