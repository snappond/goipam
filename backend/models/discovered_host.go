package models

import (
	"time"
)

type DiscoveredHost struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	SubnetID       uint      `gorm:"not null;uniqueIndex:idx_disc_subnet_ip" json:"subnet_id"`
	IPAddress      string    `gorm:"size:15;not null;uniqueIndex:idx_disc_subnet_ip" json:"ip_address"`
	MACAddress     string    `gorm:"size:20" json:"mac_address"`
	Hostname       string    `gorm:"size:255" json:"hostname"`
	ResponseTimeMS float64   `json:"response_time_ms"`
	Status         string    `gorm:"size:20;default:'pending';not null" json:"status"` // pending, registered, ignored
	DiscoveredAt   time.Time `json:"discovered_at"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

