package activities

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/AdonisEnProvence/MusicRoom/shared"
)

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

func CreationAcknowledgementActivity(_ context.Context, state shared.ControlState) error {
	marshaledBody, err := json.Marshal(state)
	if err != nil {
		return err
	}

	url := ADONIS_ENDPOINT + "/temporal/mtv-creation-acknowledgement"

	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func JoinActivity(ctx context.Context, state shared.ControlState) error {
	marshaledBody, err := json.Marshal(state)
	if err != nil {
		return err
	}

	url := ADONIS_ENDPOINT + "/temporal/join"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}
