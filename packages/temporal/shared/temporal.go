package shared

import "os"

func GetTemporalHostPort() string {
	host := os.Getenv("TEMPORAL_CLUSTER_HOST")
	if host == "" {
		return ""
	}

	return host + ":7233"
}
