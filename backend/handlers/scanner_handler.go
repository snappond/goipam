package handlers

import (
	"net/http"
	"strconv"
	"time"

	"goipam/database"
	"goipam/models"
	"goipam/services"

	"github.com/labstack/echo/v4"
)

type RegisterDiscoveredRequest struct {
	Status      string `json:"status"` // active, reserved, dhcp
	Hostname    string `json:"hostname"`
	Description string `json:"description"`
	Owner       string `json:"owner"`
}

// TriggerSubnetStatusScan はサブネット内の登録済み全IPの死活確認を即座に実行します
func TriggerSubnetStatusScan(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid subnet id"})
	}

	result, err := services.ScanSubnetRegisteredAddresses(uint(id))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, result)
}

// TriggerSubnetDiscovery はサブネット内の未登録生存ホストの自動探索を即座に実行します
func TriggerSubnetDiscovery(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid subnet id"})
	}

	result, err := services.DiscoverSubnetHosts(uint(id))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, result)
}

// ListDiscoveredHosts はサブネット配下の検出ホスト一覧（未登録候補）を取得します
func ListDiscoveredHosts(c echo.Context) error {
	subnetID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid subnet id"})
	}

	var hosts []models.DiscoveredHost
	if err := database.DB.Where("subnet_id = ? AND status = ?", subnetID, "pending").
		Order("discovered_at DESC").Find(&hosts).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, hosts)
}

// RegisterDiscoveredHost は検出されたホストを正式なIPアドレスとして承認・登録します
func RegisterDiscoveredHost(c echo.Context) error {
	discID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid discovered host id"})
	}

	var disc models.DiscoveredHost
	if err := database.DB.First(&disc, discID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "discovered host not found"})
	}

	var req RegisterDiscoveredRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid request body"})
	}

	status := "active"
	if req.Status != "" {
		status = req.Status
	}

	hostname := disc.Hostname
	if req.Hostname != "" {
		hostname = req.Hostname
	}

	now := time.Now()
	addr := models.IPAddress{
		SubnetID:    disc.SubnetID,
		IPAddress:   disc.IPAddress,
		Status:      status,
		AliveStatus: "online",
		Hostname:    hostname,
		MACAddress:  disc.MACAddress,
		Description: req.Description,
		Owner:       req.Owner,
		LastSeen:    &disc.DiscoveredAt,
		LastChecked: &now,
	}

	if err := database.DB.Create(&addr).Error; err != nil {
		return c.JSON(http.StatusConflict, echo.Map{"error": "Failed to create IP address: " + err.Error()})
	}

	// 検出ホストのステータスを registered に更新
	database.DB.Model(&disc).Update("status", "registered")

	return c.JSON(http.StatusCreated, addr)
}

// DeleteDiscoveredHost は検出ホスト候補を削除/無視します
func DeleteDiscoveredHost(c echo.Context) error {
	discID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid discovered host id"})
	}

	if err := database.DB.Delete(&models.DiscoveredHost{}, discID).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	return c.NoContent(http.StatusNoContent)
}

