package activities

import (
	"adonis-en-provence/music_room/shared"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

func PingActivity(_ context.Context) error {
	fmt.Println("activity ping " + ADONIS_ENDPOINT)
	_, err := http.Get(ADONIS_ENDPOINT + "/ping")
	if err != nil {
		fmt.Println("failed to ping to adonis server")
	}
	return err
}

func PauseActivity(_ context.Context, roomID string) error {
	url := ADONIS_ENDPOINT + "/temporal/pause/" + url.QueryEscape(roomID)
	_, err := http.Get(url)
	if err != nil {
		fmt.Println("PauseActivity Failed")
	}
	return err
}

func PlayActivity(_ context.Context, roomID string) error {
	url := ADONIS_ENDPOINT + "/temporal/play/" + url.QueryEscape(roomID)
	_, err := http.Get(url)
	if err != nil {
		fmt.Println("PlayActivity Failed")
	}
	return err
}

type CreationAcknowledgementActivityArgs struct {
	RoomID string
	UserID string
	State  shared.ControlState
}

type CreationAcknowledgementBody struct {
	RoomID string              `json:"roomID"`
	UserID string              `json:"userID"`
	State  shared.ControlState `json:"state"`
}

func CreationAcknowledgementActivity(_ context.Context, args CreationAcknowledgementActivityArgs) error {
	body := CreationAcknowledgementBody{
		RoomID: args.RoomID,
		UserID: args.UserID,
		State:  args.State,
	}
	marshaledBody, err := json.Marshal(body)
	if err != nil {
		return err
	}

	url := ADONIS_ENDPOINT + "/temporal/mtv-creation-acknowledgement"

	fmt.Printf("url to request = %v\n", url)

	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

type JoinActivityBody struct {
	State shared.ControlState `json:"state"`
}

func JoinActivity(ctx context.Context, roomID string, userID string, state shared.ControlState) error {
	body := JoinActivityBody{
		State: state,
	}
	marshaledBody, err := json.Marshal(body)
	if err != nil {
		return err
	}

	url := ADONIS_ENDPOINT + "/temporal/join/" + url.QueryEscape(roomID) + "/" + url.QueryEscape(userID)
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}
