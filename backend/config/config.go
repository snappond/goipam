package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port               string
	DBHost             string
	DBPort             string
	DBUser             string
	DBPassword         string
	DBName             string
	ScanIntervalMin    int
	DiscoverIntervalHr int
}

func LoadConfig() *Config {
	port := getEnv("PORT", "8080")
	dbHost := getEnv("DB_HOST", "db")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPass := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "goipam")

	return &Config{
		Port:               port,
		DBHost:             dbHost,
		DBPort:             dbPort,
		DBUser:             dbUser,
		DBPassword:         dbPasswordOrEmpty(dbPass),
		DBName:             dbName,
		ScanIntervalMin:    15,
		DiscoverIntervalHr: 1,
	}
}

func (c *Config) DSN() string {
	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		c.DBHost, c.DBUser, c.DBPassword, c.DBName, c.DBPort)
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func dbPasswordOrEmpty(pass string) string {
	if pass == "" {
		return "postgres"
	}
	return pass
}

