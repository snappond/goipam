package models

import (
	"time"
)

type IPAddress struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	SubnetID    uint       `gorm:"not null;uniqueIndex:idx_subnet_ip" json:"subnet_id"`
	IPAddress   string     `gorm:"size:15;not null;uniqueIndex:idx_subnet_ip" json:"ip_address"`
	Status      string     `gorm:"size:20;default:'active';not null" json:"status"`           // active, reserved, dhcp, offline
	AliveStatus string     `gorm:"size:20;default:'unknown';not null" json:"alive_status"`     // online, offline, unknown
	Hostname    string     `gorm:"size:255" json:"hostname"`
	MACAddress  string     `gorm:"size:20" json:"mac_address"`
	Description string     `gorm:"type:text" json:"description"`
	Owner       string     `gorm:"size:100" json:"owner"`
	LastSeen    *time.Time `json:"last_seen"`
	LastChecked *time.Time `json:"last_checked"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

