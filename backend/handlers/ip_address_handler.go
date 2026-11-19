package handlers

import (
	"net"
	"net/http"
	"strconv"
	"time"

	"goipam/database"
	"goipam/models"
	"goipam/services"

	"github.com/labstack/echo/v4"
)

type CreateIPAddressRequest struct {
	IPAddress   string `json:"ip_address"`
	Status      string `json:"status"` // active, reserved, dhcp, offline
	Hostname    string `json:"hostname"`
	MACAddress  string `json:"mac_address"`
	Description string `json:"description"`
	Owner       string `json:"owner"`
}

type UpdateIPAddressRequest struct {
	Status      string `json:"status"`
	Hostname    string `json:"hostname"`
	MACAddress  string `json:"mac_address"`
	Description string `json:"description"`
	Owner       string `json:"owner"`
}

// ListIPAddresses は指定サブネット内のIPアドレス一覧を取得します
func ListIPAddresses(c echo.Context) error {
	subnetID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid subnet id"})
	}

	var ips []models.IPAddress
	if err := database.DB.Where("subnet_id = ?", subnetID).Order("inet(ip_address) ASC").Find(&ips).Error; err != nil {
		// inet() キャストでエラーになる場合は文字列順でフォールバック
		database.DB.Where("subnet_id = ?", subnetID).Order("ip_address ASC").Find(&ips)
	}

	return c.JSON(http.StatusOK, ips)
}

// CreateIPAddress はサブネット内に新しいIPアドレスを割り当て登録します
func CreateIPAddress(c echo.Context) error {
	subnetID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid subnet id"})
	}

	var subnet models.Subnet
	if err := database.DB.First(&subnet, subnetID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "subnet not found"})
	}

	var req CreateIPAddressRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid request body"})
	}

	if req.IPAddress == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "ip_address is required"})
	}

	// IPアドレスが有効かつサブネット範囲内かを検証
	ip := net.ParseIP(req.IPAddress)
	if ip == nil || ip.To4() == nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid IPv4 address"})
	}

	_, ipNet, _ := net.ParseCIDR(subnet.CIDR)
	if !ipNet.Contains(ip) {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "IP address is outside of subnet range"})
	}

	status := "active"
	if req.Status != "" {
		status = req.Status
	}

	addr := models.IPAddress{
		SubnetID:    uint(subnetID),
		IPAddress:   req.IPAddress,
		Status:      status,
		AliveStatus: "unknown",
		Hostname:    req.Hostname,
		MACAddress:  req.MACAddress,
		Description: req.Description,
		Owner:       req.Owner,
	}

	if err := database.DB.Create(&addr).Error; err != nil {
		return c.JSON(http.StatusConflict, echo.Map{"error": "IP address already registered in this subnet: " + err.Error()})
	}

	// もし discovered_hosts に登録済みのIPがあれば registered に更新
	database.DB.Model(&models.DiscoveredHost{}).
		Where("subnet_id = ? AND ip_address = ?", subnetID, req.IPAddress).
		Update("status", "registered")

	return c.JSON(http.StatusCreated, addr)
}

// UpdateIPAddress は登録済みIPアドレスのメタデータを更新します
func UpdateIPAddress(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid ip id"})
	}

	var addr models.IPAddress
	if err := database.DB.First(&addr, id).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "ip address not found"})
	}

	var req UpdateIPAddressRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid request body"})
	}

	updates := map[string]interface{}{}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	updates["hostname"] = req.Hostname
	updates["mac_address"] = req.MACAddress
	updates["description"] = req.Description
	updates["owner"] = req.Owner

	if err := database.DB.Model(&addr).Updates(updates).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	database.DB.First(&addr, id)
	return c.JSON(http.StatusOK, addr)
}

// DeleteIPAddress はIPアドレス登録を削除します
func DeleteIPAddress(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid ip id"})
	}

	if err := database.DB.Delete(&models.IPAddress{}, id).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	return c.NoContent(http.StatusNoContent)
}

// PingSingleIP は単一の登録IPに対してオンデマンドPingを実行します
func PingSingleIP(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid ip id"})
	}

	var addr models.IPAddress
	if err := database.DB.First(&addr, id).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "ip address not found"})
	}

	alive, rtt := services.PingTarget(addr.IPAddress, 1*time.Second)
	now := time.Now()
	addr.LastChecked = &now

	if alive {
		addr.AliveStatus = "online"
		addr.LastSeen = &now
	} else {
		addr.AliveStatus = "offline"
	}

	database.DB.Model(&addr).Updates(map[string]interface{}{
		"alive_status": addr.AliveStatus,
		"last_seen":    addr.LastSeen,
		"last_checked": addr.LastChecked,
	})

	rttMS := float64(rtt.Microseconds()) / 1000.0

	return c.JSON(http.StatusOK, echo.Map{
		"ip_address":       addr.IPAddress,
		"alive_status":     addr.AliveStatus,
		"response_time_ms": rttMS,
		"last_seen":        addr.LastSeen,
	})
}

