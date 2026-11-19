package database

import (
	"log"
	"time"

	"goipam/config"
	"goipam/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := cfg.DSN()
	var db *gorm.DB
	var err error

	// DBコンテナ起動直後の接続待機リトライ
	for i := 0; i < 15; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err == nil {
			break
		}
		log.Printf("Connecting to database... retry %d/15 in 2s", i+1)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		return nil, err
	}

	log.Println("Database connection established.")

	// AutoMigrate
	err = db.AutoMigrate(
		&models.Subnet{},
		&models.IPAddress{},
		&models.DiscoveredHost{},
	)
	if err != nil {
		return nil, err
	}

	log.Println("Database migration completed.")
	DB = db
	return db, nil
}

