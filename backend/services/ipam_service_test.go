package services

import (
	"testing"
)

func TestParseCIDR(t *testing.T) {
	details, err := ParseCIDR("192.168.1.0/24")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if details.NetworkAddress != "192.168.1.0" {
		t.Errorf("expected network 192.168.1.0, got %s", details.NetworkAddress)
	}
	if details.BroadcastAddress != "192.168.1.255" {
		t.Errorf("expected broadcast 192.168.1.255, got %s", details.BroadcastAddress)
	}
	if details.Mask != "255.255.255.0" {
		t.Errorf("expected mask 255.255.255.0, got %s", details.Mask)
	}
	if details.TotalHosts != 254 {
		t.Errorf("expected 254 hosts, got %d", details.TotalHosts)
	}
}

func TestFindFirstFreeIP(t *testing.T) {
	used := []string{"192.168.1.1", "192.168.1.2"}
	freeIP, err := FindFirstFreeIP("192.168.1.0/24", used)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if freeIP != "192.168.1.3" {
		t.Errorf("expected 192.168.1.3, got %s", freeIP)
	}
}

