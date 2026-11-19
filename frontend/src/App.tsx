import { useState, useEffect } from 'react';
import { Subnet } from './types';
import { getSubnets } from './api/client';
import { Navbar } from './components/Navbar';
import { SubnetList } from './components/SubnetList';
import { SubnetDetail } from './components/SubnetDetail';
import { CreateSubnetModal } from './components/CreateSubnetModal';
import { CreateIPModal } from './components/CreateIPModal';

export function App() {
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [selectedSubnet, setSelectedSubnet] = useState<Subnet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateSubnetOpen, setIsCreateSubnetOpen] = useState(false);
  const [isCreateIPOpen, setIsCreateIPOpen] = useState(false);

  const fetchSubnets = async () => {
    setIsLoading(true);
    try {
      const data = await getSubnets();
      setSubnets(data);
      if (selectedSubnet) {
        const updated = data.find((s) => s.id === selectedSubnet.id);
        if (updated) setSelectedSubnet(updated);
      }
    } catch (err) {
      console.error('Failed to fetch subnets', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubnets();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        onOpenCreateSubnet={() => setIsCreateSubnetOpen(true)}
        onRefresh={fetchSubnets}
        isLoading={isLoading}
        selectedSubnetName={selectedSubnet ? `${selectedSubnet.name} (${selectedSubnet.cidr})` : undefined}
        onBackToHome={() => setSelectedSubnet(null)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedSubnet ? (
          <SubnetDetail
            subnet={selectedSubnet}
            onBack={() => setSelectedSubnet(null)}
            onOpenCreateIP={() => setIsCreateIPOpen(true)}
            onSubnetUpdated={fetchSubnets}
          />
        ) : (
          <SubnetList
            subnets={subnets}
            onSelectSubnet={(subnet) => setSelectedSubnet(subnet)}
            onRefresh={fetchSubnets}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        GoIPAM - Lightweight IPv4 Address Management System (Inspired by phpIPAM)
      </footer>

      {/* モーダル群 */}
      <CreateSubnetModal
        isOpen={isCreateSubnetOpen}
        onClose={() => setIsCreateSubnetOpen(false)}
        onSuccess={fetchSubnets}
      />

      {selectedSubnet && (
        <CreateIPModal
          isOpen={isCreateIPOpen}
          onClose={() => setIsCreateIPOpen(false)}
          onSuccess={fetchSubnets}
          subnetId={selectedSubnet.id}
        />
      )}
    </div>
  );
}

export default App;

