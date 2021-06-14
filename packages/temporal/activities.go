package app

import (
	"bytes"
	"context"
	"encoding/json"
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
	url := adonisEndpoint + "/temporal/pause/" + url.QueryEscape(roomID)
	_, err := http.Get(url)
	if err != nil {
		fmt.Println("PauseActivity Failed")
	}
	return err
}

func PlayActivity(_ context.Context, roomID string) error {
	url := adonisEndpoint + "/temporal/play/" + url.QueryEscape(roomID)
	_, err := http.Get(url)
	if err != nil {
		fmt.Println("PlayActivity Failed")
	}
	return err
}

type JoinActivityBody struct {
	State ControlState `json:"state"`
}

func JoinActivity(ctx context.Context, roomID string, userID string, state ControlState) error {
	body := JoinActivityBody{
		State: state,
	}
	marshaledBody, err := json.Marshal(body)
	if err != nil {
		return err
	}

	url := adonisEndpoint + "/temporal/join/" + url.QueryEscape(roomID) + "/" + url.QueryEscape(userID)
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}
