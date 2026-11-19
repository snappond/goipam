package handlers

import (
	"math"
	"net/http"
	"strconv"

	"goipam/database"
	"goipam/models"
	"goipam/services"

	"github.com/labstack/echo/v4"
)

type CreateSubnetRequest struct {
	CIDR            string `json:"cidr"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	VlanID          *int   `json:"vlan_id"`
	ScanEnabled     *bool  `json:"scan_enabled"`
	DiscoverEnabled *bool  `json:"discover_enabled"`
}

type UpdateSubnetRequest struct {
	Name            string `json:"name"`
	Description     string `json:"description"`
	VlanID          *int   `json:"vlan_id"`
	ScanEnabled     *bool  `json:"scan_enabled"`
	DiscoverEnabled *bool  `json:"discover_enabled"`
}

// ListSubnets はサブネット一覧を取得し、使用率と空きIP数を計算して返します
func ListSubnets(c echo.Context) error {
	var subnets []models.Subnet
	if err := database.DB.Order("created_at DESC").Find(&subnets).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	for i := range subnets {
		var count int64
		database.DB.Model(&models.IPAddress{}).Where("subnet_id = ?", subnets[i].ID).Count(&count)
		subnets[i].UsedHosts = int(count)
		if subnets[i].TotalHosts > 0 {
			pct := (float64(count) / float64(subnets[i].TotalHosts)) * 100.0
			subnets[i].UsagePercentage = math.Round(pct*10) / 10
		}
	}

	return c.JSON(http.StatusOK, subnets)
}

// GetSubnet は単一のサブネット詳細を取得します
func GetSubnet(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid subnet id"})
	}

	var subnet models.Subnet
	if err := database.DB.First(&subnet, id).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "subnet not found"})
	}

	var count int64
	database.DB.Model(&models.IPAddress{}).Where("subnet_id = ?", subnet.ID).Count(&count)
	subnet.UsedHosts = int(count)
	if subnet.TotalHosts > 0 {
		pct := (float64(count) / float64(subnet.TotalHosts)) * 100.0
		subnet.UsagePercentage = math.Round(pct*10) / 10
	}

	return c.JSON(http.StatusOK, subnet)
}

// CreateSubnet は新しいサブネットをCIDRから自動計算して作成します
func CreateSubnet(c echo.Context) error {
	var req CreateSubnetRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid request body"})
	}

	if req.CIDR == "" || req.Name == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "cidr and name are required"})
	}

	details, err := services.ParseCIDR(req.CIDR)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	scanEnabled := true
	if req.ScanEnabled != nil {
		scanEnabled = *req.ScanEnabled
	}
	discoverEnabled := true
	if req.DiscoverEnabled != nil {
		discoverEnabled = *req.DiscoverEnabled
	}

	subnet := models.Subnet{
		CIDR:             req.CIDR,
		Name:             req.Name,
		Description:      req.Description,
		VlanID:           req.VlanID,
		ScanEnabled:      scanEnabled,
		DiscoverEnabled:  discoverEnabled,
		NetworkAddress:   details.NetworkAddress,
		BroadcastAddress: details.BroadcastAddress,
		Mask:             details.Mask,
		TotalHosts:       details.TotalHosts,
	}

	if err := database.DB.Create(&subnet).Error; err != nil {
		return c.JSON(http.StatusConflict, echo.Map{"error": "subnet with this CIDR may already exist: " + err.Error()})
	}

	return c.JSON(http.StatusCreated, subnet)
}

// UpdateSubnet はサブネットのメタデータを更新します
func UpdateSubnet(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid subnet id"})
	}

	var subnet models.Subnet
	if err := database.DB.First(&subnet, id).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "subnet not found"})
	}

	var req UpdateSubnetRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid request body"})
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	updates["description"] = req.Description
	updates["vlan_id"] = req.VlanID
	if req.ScanEnabled != nil {
		updates["scan_enabled"] = *req.ScanEnabled
	}
	if req.DiscoverEnabled != nil {
		updates["discover_enabled"] = *req.DiscoverEnabled
	}

	if err := database.DB.Model(&subnet).Updates(updates).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	database.DB.First(&subnet, id)
	return c.JSON(http.StatusOK, subnet)
}

// DeleteSubnet はサブネットを削除します
func DeleteSubnet(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid subnet id"})
	}

	if err := database.DB.Delete(&models.Subnet{}, id).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	return c.NoContent(http.StatusNoContent)
}

// GetFirstFreeIP はサブネット内の最初の空きIPを返します
func GetFirstFreeIP(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid subnet id"})
	}

	var subnet models.Subnet
	if err := database.DB.First(&subnet, id).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "subnet not found"})
	}

	var usedIPs []string
	database.DB.Model(&models.IPAddress{}).Where("subnet_id = ?", id).Pluck("ip_address", &usedIPs)

	freeIP, err := services.FindFirstFreeIP(subnet.CIDR, usedIPs)
	if err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, echo.Map{"first_free_ip": freeIP})
}

