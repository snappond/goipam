export interface Subnet {
  id: number;
  cidr: string;
  name: string;
  description: string;
  vlan_id?: number | null;
  scan_enabled: boolean;
  discover_enabled: boolean;
  network_address: string;
  broadcast_address: string;
  mask: string;
  total_hosts: number;
  used_hosts: number;
  usage_percentage: number;
  created_at: string;
  updated_at: string;
}

export type IPStatus = 'active' | 'reserved' | 'dhcp' | 'offline';
export type AliveStatus = 'online' | 'offline' | 'unknown';

export interface IPAddress {
  id: number;
  subnet_id: number;
  ip_address: string;
  status: IPStatus;
  alive_status: AliveStatus;
  hostname: string;
  mac_address: string;
  description: string;
  owner: string;
  last_seen?: string | null;
  last_checked?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscoveredHost {
  id: number;
  subnet_id: number;
  ip_address: string;
  mac_address: string;
  hostname: string;
  response_time_ms: number;
  status: 'pending' | 'registered' | 'ignored';
  discovered_at: string;
  created_at: string;
  updated_at: string;
}

export interface ScanStatusResult {
  scanned_count: number;
  online_count: number;
  offline_count: number;
  elapsed_ms: number;
}

export interface DiscoveryResult {
  total_tested: number;
  new_hosts_found: number;
  elapsed_ms: number;
}

export interface SinglePingResult {
  ip_address: string;
  alive_status: AliveStatus;
  response_time_ms: number;
  last_seen?: string;
}

