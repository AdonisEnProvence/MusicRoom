package activities

import (
	"adonis-en-provence/music_room/shared"
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/url"
)

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

type JoinActivityArgs struct {
	RoomID string
	UserID string
	State  shared.ControlState
}

type JoinActivityBody struct {
	RoomID string              `json:"roomID"`
	UserID string              `json:"userID"`
	State  shared.ControlState `json:"state"`
}

func PingActivity(_ context.Context) error {
	_, err := http.Get(ADONIS_ENDPOINT + "/ping")

	return err
}

func PauseActivity(_ context.Context, roomID string) error {
	url := ADONIS_ENDPOINT + "/temporal/pause/" + url.QueryEscape(roomID)
	_, err := http.Get(url)

	return err
}

func PlayActivity(_ context.Context, roomID string) error {
	url := ADONIS_ENDPOINT + "/temporal/play/" + url.QueryEscape(roomID)
	_, err := http.Get(url)

	return err
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

	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func JoinActivity(ctx context.Context, args JoinActivityArgs) error {
	body := JoinActivityBody{
		RoomID: args.RoomID,
		UserID: args.UserID,
		State:  args.State,
	}
	marshaledBody, err := json.Marshal(body)
	if err != nil {
		return err
	}

	url := ADONIS_ENDPOINT + "/temporal/join"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}
