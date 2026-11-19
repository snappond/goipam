package models

import (
	"time"
)

type Subnet struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	CIDR             string    `gorm:"size:18;not null;uniqueIndex" json:"cidr"`
	Name             string    `gorm:"size:100;not null" json:"name"`
	Description      string    `gorm:"type:text" json:"description"`
	VlanID           *int      `json:"vlan_id"`
	ScanEnabled      bool      `gorm:"default:true;not null" json:"scan_enabled"`
	DiscoverEnabled  bool      `gorm:"default:true;not null" json:"discover_enabled"`
	NetworkAddress   string    `gorm:"size:15;not null" json:"network_address"`
	BroadcastAddress string    `gorm:"size:15;not null" json:"broadcast_address"`
	Mask             string    `gorm:"size:15;not null" json:"mask"`
	TotalHosts       int       `gorm:"not null" json:"total_hosts"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`

	// リレーション
	IPAddresses     []IPAddress      `gorm:"foreignKey:SubnetID;constraint:OnDelete:CASCADE" json:"ip_addresses,omitempty"`
	DiscoveredHosts []DiscoveredHost `gorm:"foreignKey:SubnetID;constraint:OnDelete:CASCADE" json:"discovered_hosts,omitempty"`

	// 計算フィールド（一覧取得時等に付与）
	UsedHosts       int     `gorm:"-" json:"used_hosts"`
	UsagePercentage float64 `gorm:"-" json:"usage_percentage"`
}

