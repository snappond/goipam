package services

import (
	"encoding/binary"
	"fmt"
	"net"
)

type CIDRDetails struct {
	NetworkAddress   string
	BroadcastAddress string
	Mask             string
	TotalHosts       int
	UsableIPs        []string
}

// ParseCIDR はCIDR文字列を解析し、ネットワーク/ブロードキャスト/マスク/総ホスト数を計算します
func ParseCIDR(cidrStr string) (*CIDRDetails, error) {
	ip, ipNet, err := net.ParseCIDR(cidrStr)
	if err != nil {
		return nil, fmt.Errorf("invalid CIDR format: %w", err)
	}

	ipv4 := ip.To4()
	if ipv4 == nil {
		return nil, fmt.Errorf("only IPv4 is supported")
	}

	mask := ipNet.Mask
	ones, bits := mask.Size()
	if bits != 32 {
		return nil, fmt.Errorf("invalid IPv4 mask")
	}

	netInt := binary.BigEndian.Uint32(ipNet.IP.To4())
	maskInt := binary.BigEndian.Uint32(mask)
	broadcastInt := netInt | ^maskInt

	netIP := make(net.IP, 4)
	binary.BigEndian.PutUint32(netIP, netInt)

	broadcastIP := make(net.IP, 4)
	binary.BigEndian.PutUint32(broadcastIP, broadcastInt)

	maskIP := make(net.IP, 4)
	binary.BigEndian.PutUint32(maskIP, maskInt)

	var totalHosts int
	var usableStart, usableEnd uint32

	switch ones {
	case 32:
		totalHosts = 1
		usableStart = netInt
		usableEnd = netInt
	case 31:
		totalHosts = 2
		usableStart = netInt
		usableEnd = broadcastInt
	default:
		hostBits := 32 - ones
		totalHosts = (1 << hostBits) - 2
		usableStart = netInt + 1
		usableEnd = broadcastInt - 1
	}

	// 利用可能IPのリストを生成（/16以下などの大きすぎるサブネット時は上限を設定）
	maxListSize := 1024
	var usableIPs []string
	if totalHosts <= maxListSize {
		usableIPs = make([]string, 0, totalHosts)
		for current := usableStart; current <= usableEnd; current++ {
			tmpIP := make(net.IP, 4)
			binary.BigEndian.PutUint32(tmpIP, current)
			usableIPs = append(usableIPs, tmpIP.String())
		}
	}

	return &CIDRDetails{
		NetworkAddress:   netIP.String(),
		BroadcastAddress: broadcastIP.String(),
		Mask:             maskIP.String(),
		TotalHosts:       totalHosts,
		UsableIPs:        usableIPs,
	}, nil
}

// FindFirstFreeIP は利用可能IPの中から、既に割り当てられているIP一覧に含まれない最初のIPを返します
func FindFirstFreeIP(cidrStr string, usedIPs []string) (string, error) {
	if _, err := ParseCIDR(cidrStr); err != nil {
		return "", err
	}

	usedSet := make(map[string]bool, len(usedIPs))
	for _, ip := range usedIPs {
		usedSet[ip] = true
	}

	// 登録されていない最小の利用可能IPを探す
	_, ipNet, _ := net.ParseCIDR(cidrStr)
	ones, _ := ipNet.Mask.Size()
	netInt := binary.BigEndian.Uint32(ipNet.IP.To4())
	maskInt := binary.BigEndian.Uint32(ipNet.Mask)
	broadcastInt := netInt | ^maskInt

	var usableStart, usableEnd uint32
	if ones == 32 {
		usableStart = netInt
		usableEnd = netInt
	} else if ones == 31 {
		usableStart = netInt
		usableEnd = broadcastInt
	} else {
		usableStart = netInt + 1
		usableEnd = broadcastInt - 1
	}

	for current := usableStart; current <= usableEnd; current++ {
		tmpIP := make(net.IP, 4)
		binary.BigEndian.PutUint32(tmpIP, current)
		ipStr := tmpIP.String()
		if !usedSet[ipStr] {
			return ipStr, nil
		}
	}

	return "", fmt.Errorf("no free IP available in this subnet")
}

// GetAllUsableIPs はサブネット内の全利用可能IPスライスを返します (スキャン用)
func GetAllUsableIPs(cidrStr string) ([]string, error) {
	_, ipNet, err := net.ParseCIDR(cidrStr)
	if err != nil {
		return nil, err
	}

	ones, _ := ipNet.Mask.Size()
	netInt := binary.BigEndian.Uint32(ipNet.IP.To4())
	maskInt := binary.BigEndian.Uint32(ipNet.Mask)
	broadcastInt := netInt | ^maskInt

	var usableStart, usableEnd uint32
	if ones == 32 {
		usableStart = netInt
		usableEnd = netInt
	} else if ones == 31 {
		usableStart = netInt
		usableEnd = broadcastInt
	} else {
		usableStart = netInt + 1
		usableEnd = broadcastInt - 1
	}

	count := int(usableEnd - usableStart + 1)
	ips := make([]string, 0, count)
	for current := usableStart; current <= usableEnd; current++ {
		tmpIP := make(net.IP, 4)
		binary.BigEndian.PutUint32(tmpIP, current)
		ips = append(ips, tmpIP.String())
	}

	return ips, nil
}
