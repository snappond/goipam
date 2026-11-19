package services

import (
	"bufio"
	"context"
	"log"
	"net"
	"os"
	"strings"
	"sync"
	"time"

	"goipam/database"
	"goipam/models"

	probing "github.com/prometheus-community/pro-bing"
)

type PingResult struct {
	IPAddress string
	Alive     bool
	RTT       time.Duration
	Hostname  string
	MAC       string
}

type ScanStatusResult struct {
	ScannedCount int           `json:"scanned_count"`
	OnlineCount  int           `json:"online_count"`
	OfflineCount int           `json:"offline_count"`
	ElapsedMS    int64         `json:"elapsed_ms"`
}

type DiscoveryResult struct {
	TotalTested    int   `json:"total_tested"`
	NewHostsFound  int   `json:"new_hosts_found"`
	ElapsedMS      int64 `json:"elapsed_ms"`
}

// PingTarget は単一IPに対してPingを送信し、死活とRTTを測定します
func PingTarget(ip string, timeout time.Duration) (bool, time.Duration) {
	pinger, err := probing.NewPinger(ip)
	if err != nil {
		return false, 0
	}

	pinger.Count = 1
	pinger.Timeout = timeout
	// Linuxの非特権Pingソケット (sysctl ping_group_range設定時) に対応
	pinger.SetPrivileged(false)

	err = pinger.Run()
	if err != nil {
		// 非特権で失敗した場合はPrivilegedモードでフォールバック試行
		pinger.SetPrivileged(true)
		if err := pinger.Run(); err != nil {
			return false, 0
		}
	}

	stats := pinger.Statistics()
	if stats.PacketsRecv > 0 {
		return true, stats.AvgRtt
	}
	return false, 0
}

// LookupHostInfo は逆引きDNSとローカルARPテーブルからホスト名とMACアドレスを取得します
func LookupHostInfo(ip string) (string, string) {
	var hostname string
	names, err := net.LookupAddr(ip)
	if err == nil && len(names) > 0 {
		hostname = strings.TrimSuffix(names[0], ".")
	}

	mac := lookupARPMAC(ip)
	return hostname, mac
}

// lookupARPMAC はLinux環境の /proc/net/arp を参照してMACアドレスを探索します
func lookupARPMAC(targetIP string) string {
	file, err := os.Open("/proc/net/arp")
	if err != nil {
		return ""
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Fields(line)
		if len(fields) >= 4 && fields[0] == targetIP {
			mac := fields[3]
			if mac != "00:00:00:00:00:00" && len(mac) == 17 {
				return mac
			}
		}
	}
	return ""
}

// ScanSubnetRegisteredAddresses はサブネットに登録されている全IPの死活確認を行います
func ScanSubnetRegisteredAddresses(subnetID uint) (*ScanStatusResult, error) {
	startTime := time.Now()
	var ips []models.IPAddress
	if err := database.DB.Where("subnet_id = ?", subnetID).Find(&ips).Error; err != nil {
		return nil, err
	}

	if len(ips) == 0 {
		return &ScanStatusResult{ScannedCount: 0, ElapsedMS: 0}, nil
	}

	workerLimit := 32
	sem := make(chan struct{}, workerLimit)
	var wg sync.WaitGroup
	var mu sync.Mutex

	onlineCount := 0
	offlineCount := 0
	now := time.Now()

	for i := range ips {
		wg.Add(1)
		go func(addr models.IPAddress) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			alive, _ := PingTarget(addr.IPAddress, 1*time.Second)

			mu.Lock()
			defer mu.Unlock()

			addr.LastChecked = &now
			if alive {
				addr.AliveStatus = "online"
				addr.LastSeen = &now
				onlineCount++
			} else {
				addr.AliveStatus = "offline"
				offlineCount++
			}

			// DB更新
			database.DB.Model(&models.IPAddress{}).Where("id = ?", addr.ID).Updates(map[string]interface{}{
				"alive_status": addr.AliveStatus,
				"last_seen":    addr.LastSeen,
				"last_checked": addr.LastChecked,
			})
		}(ips[i])
	}

	wg.Wait()
	elapsed := time.Since(startTime).Milliseconds()

	return &ScanStatusResult{
		ScannedCount: len(ips),
		OnlineCount:  onlineCount,
		OfflineCount: offlineCount,
		ElapsedMS:    elapsed,
	}, nil
}

// DiscoverSubnetHosts はサブネットの全利用可能IPを走査し、未登録で生存しているホストを探索します
func DiscoverSubnetHosts(subnetID uint) (*DiscoveryResult, error) {
	startTime := time.Now()

	var subnet models.Subnet
	if err := database.DB.First(&subnet, subnetID).Error; err != nil {
		return nil, err
	}

	usableIPs, err := GetAllUsableIPs(subnet.CIDR)
	if err != nil {
		return nil, err
	}

	// 登録済みIPを取得
	var registered []models.IPAddress
	database.DB.Where("subnet_id = ?", subnetID).Find(&registered)
	regMap := make(map[string]bool, len(registered))
	for _, r := range registered {
		regMap[r.IPAddress] = true
	}

	// 走査対象 = 未登録のIP
	var targets []string
	for _, ip := range usableIPs {
		if !regMap[ip] {
			targets = append(targets, ip)
		}
	}

	workerLimit := 32
	sem := make(chan struct{}, workerLimit)
	var wg sync.WaitGroup
	var mu sync.Mutex

	newFound := 0

	for _, ip := range targets {
		wg.Add(1)
		go func(targetIP string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			alive, rtt := PingTarget(targetIP, 800*time.Millisecond)
			if !alive {
				return
			}

			hostname, mac := LookupHostInfo(targetIP)
			now := time.Now()
			rttMS := float64(rtt.Microseconds()) / 1000.0

			mu.Lock()
			defer mu.Unlock()

			var existing models.DiscoveredHost
			err := database.DB.Where("subnet_id = ? AND ip_address = ?", subnetID, targetIP).First(&existing).Error
			if err != nil {
				// 新規作成
				disc := models.DiscoveredHost{
					SubnetID:       subnetID,
					IPAddress:      targetIP,
					MACAddress:     mac,
					Hostname:       hostname,
					ResponseTimeMS: rttMS,
					Status:         "pending",
					DiscoveredAt:   now,
				}
				if err := database.DB.Create(&disc).Error; err == nil {
					newFound++
				}
			} else {
				// 既存の更新
				updates := map[string]interface{}{
					"response_time_ms": rttMS,
					"discovered_at":   now,
				}
				if mac != "" {
					updates["mac_address"] = mac
				}
				if hostname != "" {
					updates["hostname"] = hostname
				}
				database.DB.Model(&existing).Updates(updates)
			}
		}(ip)
	}

	wg.Wait()
	elapsed := time.Since(startTime).Milliseconds()

	return &DiscoveryResult{
		TotalTested:   len(targets),
		NewHostsFound: newFound,
		ElapsedMS:     elapsed,
	}, nil
}

// StartBackgroundScheduler はバックグラウンドで定期的にPing死活確認およびホスト探索を行います
func StartBackgroundScheduler(ctx context.Context, scanIntervalMin, discoverIntervalHr int) {
	go func() {
		statusTicker := time.NewTicker(time.Duration(scanIntervalMin) * time.Minute)
		discoverTicker := time.NewTicker(time.Duration(discoverIntervalHr) * time.Hour)
		defer statusTicker.Stop()
		defer discoverTicker.Stop()

		log.Printf("Background scheduler started (Status check: every %dm, Discovery: every %dh)", scanIntervalMin, discoverIntervalHr)

		for {
			select {
			case <-ctx.Done():
				log.Println("Background scheduler stopped")
				return
			case <-statusTicker.C:
				runScheduledStatusChecks()
			case <-discoverTicker.C:
				runScheduledDiscoveries()
			}
		}
	}()
}

func runScheduledStatusChecks() {
	var subnets []models.Subnet
	if err := database.DB.Where("scan_enabled = ?", true).Find(&subnets).Error; err != nil {
		return
	}
	for _, s := range subnets {
		ScanSubnetRegisteredAddresses(s.ID)
	}
}

func runScheduledDiscoveries() {
	var subnets []models.Subnet
	if err := database.DB.Where("discover_enabled = ?", true).Find(&subnets).Error; err != nil {
		return
	}
	for _, s := range subnets {
		DiscoverSubnetHosts(s.ID)
	}
}

