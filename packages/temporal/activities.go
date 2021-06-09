package app

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"os"
)

var (
	adonisEndpoint = os.Getenv("ADONIS_ENDPOINT")
)

func PingActivity(_ context.Context) error {
	fmt.Println("activity ping " + adonisEndpoint)
	_, err := http.Get(adonisEndpoint + "/ping")
	if err != nil {
		fmt.Println("failed to ping to adonis server")
	}
	return err
}

func PauseActivity(_ context.Context, roomID string) error {
	_, err := http.Get(adonisEndpoint + "/temporal/pause/" + url.QueryEscape(roomID))
	if err != nil {
		fmt.Println("PauseActivity Failed")
	}
	return err
}

func PlayActivity(_ context.Context, roomID string) error {

	_, err := http.Get(adonisEndpoint + "/temporal/play/" + url.QueryEscape(roomID))
	if err != nil {
		fmt.Println("PlayActivity Failed")
	}
	return err
}

func JoinActivity(_ context.Context, roomID string, userID string) error {
	_, err := http.Get(adonisEndpoint + "/temporal/join/" + url.QueryEscape(roomID) + "/" + url.QueryEscape(userID))
	if err != nil {
		fmt.Println("JoinActivity Failed")
	}
	return err
}
