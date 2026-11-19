import React, { useState, useEffect } from 'react';
import { X, Server, AlertCircle, Wand2 } from 'lucide-react';
import { createIPAddress, getFirstFreeIP } from '../api/client';

interface CreateIPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subnetId: number;
}

export const CreateIPModal: React.FC<CreateIPModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  subnetId,
}) => {
  const [ipAddress, setIpAddress] = useState('');
  const [status, setStatus] = useState('active');
  const [hostname, setHostname] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFreeIP, setIsLoadingFreeIP] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleSuggestFreeIP();
    }
  }, [isOpen, subnetId]);

  const handleSuggestFreeIP = async () => {
    setIsLoadingFreeIP(true);
    try {
      const freeIP = await getFirstFreeIP(subnetId);
      setIpAddress(freeIP);
    } catch {
      // 空きIPが取得できなかった場合は手動入力
    } finally {
      setIsLoadingFreeIP(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await createIPAddress(subnetId, {
        ip_address: ipAddress.trim(),
        status,
        hostname: hostname.trim(),
        mac_address: macAddress.trim(),
        description: description.trim(),
        owner: owner.trim(),
      });
      // リセット
      setIpAddress('');
      setHostname('');
      setMacAddress('');
      setDescription('');
      setOwner('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'IPアドレスの登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2 text-slate-800">
            <Server className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-lg">IPアドレスの割り当て登録</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start space-x-2 border border-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                IPアドレス <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleSuggestFreeIP}
                disabled={isLoadingFreeIP}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1 font-medium"
              >
                <Wand2 className="w-3 h-3" />
                <span>空きIPを自動取得</span>
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="例: 192.168.1.10"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                ステータス
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active (稼働中)</option>
                <option value="reserved">Reserved (予約)</option>
                <option value="dhcp">DHCP</option>
                <option value="offline">Offline (停止)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                担当者・所有部署
              </label>
              <input
                type="text"
                placeholder="例: インフラ課"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              ホスト名 (FQDN)
            </label>
            <input
              type="text"
              placeholder="例: web01.lan"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              MACアドレス
            </label>
            <input
              type="text"
              placeholder="例: AA:BB:CC:DD:EE:FF"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              用途・説明
            </label>
            <textarea
              rows={2}
              placeholder="例: Webフロントエンドサーバー本番機"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '登録中...' : 'IPアドレスを登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

