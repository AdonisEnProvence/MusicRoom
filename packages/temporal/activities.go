package app

import (
	"context"
	"fmt"
	"net/http"
	"os"
)

var (
	adonisEndpoint = os.Getenv("ADONIS_ENDPOINT")
)

func PingActivity(_ context.Context, email string) error {
	fmt.Println("activity ping " + adonisEndpoint)
	_, err := http.Get(adonisEndpoint + "/ping")
	if err != nil {
		fmt.Println("failed to ping to adonis server")
	}
	return err
}
