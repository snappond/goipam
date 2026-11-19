package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"goipam/config"
	"goipam/database"
	"goipam/handlers"
	"goipam/services"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	cfg := config.LoadConfig()

	// データベース接続
	_, err := database.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// バックグラウンドスケジューラ開始
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	services.StartBackgroundScheduler(ctx, cfg.ScanIntervalMin, cfg.DiscoverIntervalHr)

	// Echo サーバーの初期化
	e := echo.New()
	e.HideBanner = true

	// ミドルウェア
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodHead, http.MethodPut, http.MethodPatch, http.MethodPost, http.MethodDelete},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	// API ルーティング
	api := e.Group("/api")
	{
		api.GET("/health", func(c echo.Context) error {
			return c.JSON(http.StatusOK, echo.Map{"status": "ok", "time": time.Now().UTC()})
		})

		// サブネット API
		subnets := api.Group("/subnets")
		{
			subnets.GET("", handlers.ListSubnets)
			subnets.POST("", handlers.CreateSubnet)
			subnets.GET("/:id", handlers.GetSubnet)
			subnets.PUT("/:id", handlers.UpdateSubnet)
			subnets.DELETE("/:id", handlers.DeleteSubnet)
			subnets.GET("/:id/first-free", handlers.GetFirstFreeIP)

			// サブネット配下の IP アドレス
			subnets.GET("/:id/addresses", handlers.ListIPAddresses)
			subnets.POST("/:id/addresses", handlers.CreateIPAddress)

			// サブネットのスキャン & 探索
			subnets.POST("/:id/scan-status", handlers.TriggerSubnetStatusScan)
			subnets.POST("/:id/discover", handlers.TriggerSubnetDiscovery)

			// 検出された未登録ホスト
			subnets.GET("/:id/discovered", handlers.ListDiscoveredHosts)
			subnets.DELETE("/:id/discovered", handlers.ClearSubnetDiscoveredHosts)
		}

		// IP アドレス個別 API
		addresses := api.Group("/addresses")
		{
			addresses.PUT("/:id", handlers.UpdateIPAddress)
			addresses.DELETE("/:id", handlers.DeleteIPAddress)
			addresses.POST("/:id/ping", handlers.PingSingleIP)
		}

		// 検出ホスト候補操作 API
		discovered := api.Group("/discovered")
		{
			discovered.POST("/:id/register", handlers.RegisterDiscoveredHost)
			discovered.DELETE("/:id", handlers.DeleteDiscoveredHost)
			discovered.POST("/batch-delete", handlers.BatchDeleteDiscoveredHosts)
		}
	}

	// グレースフルシャットダウン対応
	go func() {
		addr := ":" + cfg.Port
		log.Printf("Starting GoIPAM server on port %s", cfg.Port)
		if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server listen failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	cancel() // スケジューラ停止

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := e.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server gracefully stopped.")
}

