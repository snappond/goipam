import axios from 'axios';
import { Subnet, IPAddress, DiscoveredHost, ScanStatusResult, DiscoveryResult, SinglePingResult } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// サブネット関連
export const getSubnets = async (): Promise<Subnet[]> => {
  const res = await api.get('/subnets');
  return res.data;
};

export const getSubnet = async (id: number): Promise<Subnet> => {
  const res = await api.get(`/subnets/${id}`);
  return res.data;
};

export const createSubnet = async (data: {
  cidr: string;
  name: string;
  description?: string;
  vlan_id?: number | null;
  scan_enabled?: boolean;
  discover_enabled?: boolean;
}): Promise<Subnet> => {
  const res = await api.post('/subnets', data);
  return res.data;
};

export const deleteSubnet = async (id: number): Promise<void> => {
  await api.delete(`/subnets/${id}`);
};

export const getFirstFreeIP = async (subnetId: number): Promise<string> => {
  const res = await api.get(`/subnets/${subnetId}/first-free`);
  return res.data.first_free_ip;
};

// IPアドレス関連
export const getIPAddresses = async (subnetId: number): Promise<IPAddress[]> => {
  const res = await api.get(`/subnets/${subnetId}/addresses`);
  return res.data;
};

export const createIPAddress = async (
  subnetId: number,
  data: {
    ip_address: string;
    status: string;
    hostname?: string;
    mac_address?: string;
    description?: string;
    owner?: string;
  }
): Promise<IPAddress> => {
  const res = await api.post(`/subnets/${subnetId}/addresses`, data);
  return res.data;
};

export const updateIPAddress = async (
  id: number,
  data: {
    status?: string;
    hostname?: string;
    mac_address?: string;
    description?: string;
    owner?: string;
  }
): Promise<IPAddress> => {
  const res = await api.put(`/addresses/${id}`, data);
  return res.data;
};

export const deleteIPAddress = async (id: number): Promise<void> => {
  await api.delete(`/addresses/${id}`);
};

export const pingSingleIP = async (id: number): Promise<SinglePingResult> => {
  const res = await api.post(`/addresses/${id}/ping`);
  return res.data;
};

// スキャン & 探索
export const scanSubnetStatus = async (subnetId: number): Promise<ScanStatusResult> => {
  const res = await api.post(`/subnets/${subnetId}/scan-status`);
  return res.data;
};

export const discoverSubnet = async (subnetId: number): Promise<DiscoveryResult> => {
  const res = await api.post(`/subnets/${subnetId}/discover`);
  return res.data;
};

// 検出ホスト候補
export const getDiscoveredHosts = async (subnetId: number): Promise<DiscoveredHost[]> => {
  const res = await api.get(`/subnets/${subnetId}/discovered`);
  return res.data;
};

export const registerDiscoveredHost = async (
  id: number,
  data: {
    status?: string;
    hostname?: string;
    description?: string;
    owner?: string;
  }
): Promise<IPAddress> => {
  const res = await api.post(`/discovered/${id}/register`, data);
  return res.data;
};

export const deleteDiscoveredHost = async (id: number): Promise<void> => {
  await api.delete(`/discovered/${id}`);
};

