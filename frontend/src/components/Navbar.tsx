import React from 'react';
import { Network, Plus, RefreshCw } from 'lucide-react';

interface NavbarProps {
  onOpenCreateSubnet: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  selectedSubnetName?: string;
  onBackToHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreateSubnet,
  onRefresh,
  isLoading,
  selectedSubnetName,
  onBackToHome,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onBackToHome}>
          <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">GoIPAM</span>
              <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">v1.0</span>
            </div>
            <p className="text-xs text-slate-500">軽量IPv4アドレス管理システム</p>
          </div>
        </div>

        {selectedSubnetName && (
          <div className="hidden md:flex items-center space-x-2 text-sm text-slate-600">
            <button
              onClick={onBackToHome}
              className="hover:text-blue-600 hover:underline"
            >
              サブネット一覧
            </button>
            <span>/</span>
            <span className="font-semibold text-slate-900">{selectedSubnetName}</span>
          </div>
        )}

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="更新"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            onClick={onOpenCreateSubnet}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>サブネット作成</span>
          </button>
        </div>
      </div>
    </header>
  );
};

