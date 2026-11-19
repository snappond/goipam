import React, { useState } from 'react';
import { X, Network, AlertCircle } from 'lucide-react';
import { createSubnet } from '../api/client';

interface CreateSubnetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateSubnetModal: React.FC<CreateSubnetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [cidr, setCidr] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [vlanId, setVlanId] = useState('');
  const [dhcpStartIp, setDhcpStartIp] = useState('');
  const [dhcpEndIp, setDhcpEndIp] = useState('');
  const [scanEnabled, setScanEnabled] = useState(true);
  const [discoverEnabled, setDiscoverEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await createSubnet({
        cidr: cidr.trim(),
        name: name.trim(),
        description: description.trim(),
        vlan_id: vlanId ? parseInt(vlanId, 10) : null,
        scan_enabled: scanEnabled,
        discover_enabled: discoverEnabled,
        dhcp_start_ip: dhcpStartIp.trim() || undefined,
        dhcp_end_ip: dhcpEndIp.trim() || undefined,
      });
      // リセット
      setCidr('');
      setName('');
      setDescription('');
      setVlanId('');
      setDhcpStartIp('');
      setDhcpEndIp('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'サブネットの作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2 text-slate-800">
            <Network className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-lg">新規サブネット追加</h3>
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
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              CIDR <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例: 192.168.1.0/24"
              value={cidr}
              onChange={(e) => setCidr(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">ネットワークアドレスとプレフィックス長を指定</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              サブネット名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例: 社内オフィスLAN"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                VLAN ID (任意)
              </label>
              <input
                type="number"
                placeholder="例: 10"
                value={vlanId}
                onChange={(e) => setVlanId(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                説明・備考
              </label>
              <input
                type="text"
                placeholder="例: 本社ビル2Fフロア"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                DHCP除外範囲 (任意)
              </span>
              <span className="text-[10px] text-slate-500">スキャン・探索から除外</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="開始IP (例: 192.168.1.100)"
                value={dhcpStartIp}
                onChange={(e) => setDhcpStartIp(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="終了IP (例: 192.168.1.200)"
                value={dhcpEndIp}
                onChange={(e) => setDhcpEndIp(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              ※この範囲のIPは自動探索、定期死活監視、および空きIPサジェストから除外されます。
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={scanEnabled}
                onChange={(e) => setScanEnabled(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>定期PING生存確認を有効にする</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={discoverEnabled}
                onChange={(e) => setDiscoverEnabled(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>定期未登録ホスト自動探索を有効にする</span>
            </label>
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
              {isSubmitting ? '作成中...' : 'サブネットを作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

