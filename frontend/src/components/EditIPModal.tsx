import React, { useState, useEffect } from 'react';
import { IPAddress, IPStatus } from '../types';
import { updateIPAddress } from '../api/client';
import { X, Pencil, Server, Hash, User, FileText, Wifi } from 'lucide-react';

interface EditIPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  address: IPAddress;
}

const STATUS_OPTIONS: { value: IPStatus; label: string; color: string }[] = [
  { value: 'active',   label: 'Active（使用中）',    color: 'text-blue-700' },
  { value: 'reserved', label: 'Reserved（予約済み）', color: 'text-amber-700' },
  { value: 'dhcp',     label: 'DHCP（動的割当）',    color: 'text-purple-700' },
  { value: 'offline',  label: 'Offline（無効）',      color: 'text-slate-600' },
];

export const EditIPModal: React.FC<EditIPModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  address,
}) => {
  const [form, setForm] = useState({
    hostname: '',
    mac_address: '',
    status: 'active' as IPStatus,
    description: '',
    owner: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルが開くたびに現在の値で初期化
  useEffect(() => {
    if (isOpen) {
      setForm({
        hostname: address.hostname || '',
        mac_address: address.mac_address || '',
        status: address.status,
        description: address.description || '',
        owner: address.owner || '',
      });
      setError(null);
    }
  }, [isOpen, address]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await updateIPAddress(address.id, {
        hostname: form.hostname || undefined,
        mac_address: form.mac_address || undefined,
        status: form.status,
        description: form.description || undefined,
        owner: form.owner || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg || '更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-ip-modal-title"
    >
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
            <Pencil className="w-4 h-4 text-blue-600" />
            <h2
              id="edit-ip-modal-title"
              className="text-base font-semibold text-slate-900"
            >
              IPアドレス情報を編集
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* IPアドレス表示（編集不可） */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <Wifi className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div>
              <span className="text-xs text-slate-400 block">IPアドレス（変更不可）</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {address.ip_address}
              </span>
            </div>
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {/* エラー表示 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 管理ステータス */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              管理ステータス
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className={opt.color}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* ホスト名 */}
          <div>
            <label
              htmlFor="edit-ip-hostname"
              className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center space-x-1"
            >
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>ホスト名</span>
            </label>
            <input
              id="edit-ip-hostname"
              name="hostname"
              type="text"
              value={form.hostname}
              onChange={handleChange}
              placeholder="e.g. web-server-01"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
          </div>

          {/* MACアドレス */}
          <div>
            <label
              htmlFor="edit-ip-mac"
              className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center space-x-1"
            >
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>MACアドレス</span>
            </label>
            <input
              id="edit-ip-mac"
              name="mac_address"
              type="text"
              value={form.mac_address}
              onChange={handleChange}
              placeholder="e.g. aa:bb:cc:dd:ee:ff"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
          </div>

          {/* 担当者 */}
          <div>
            <label
              htmlFor="edit-ip-owner"
              className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center space-x-1"
            >
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>担当者</span>
            </label>
            <input
              id="edit-ip-owner"
              name="owner"
              type="text"
              value={form.owner}
              onChange={handleChange}
              placeholder="e.g. 山田 太郎"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 用途・備考 */}
          <div>
            <label
              htmlFor="edit-ip-description"
              className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>用途・備考</span>
            </label>
            <textarea
              id="edit-ip-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="このIPアドレスの用途や備考を記入"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* フッターボタン */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-r-transparent rounded-full animate-spin" />
                  <span>更新中...</span>
                </>
              ) : (
                <>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>変更を保存</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
