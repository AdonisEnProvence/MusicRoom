package activities_mpe

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"

	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"

	"github.com/AdonisEnProvence/MusicRoom/activities"
)

var (
	ADONIS_ENDPOINT     = os.Getenv("ADONIS_ENDPOINT")
	ADONIS_MPE_ENDPOINT = ADONIS_ENDPOINT + "/temporal/mpe"
)

type RejectAddingTracksActivityArgs struct {
	RoomID   string `json:"roomID"`
	UserID   string `json:"userID"`
	DeviceID string `json:"deviceID"`
}

type AcknowledgeAddingTracksActivityArgs struct {
	State    shared_mpe.MpeRoomExposedState `json:"state"`
	UserID   string                         `json:"userID"`
	DeviceID string                         `json:"deviceID"`
}

func (a *Activities) MpeCreationAcknowledgementActivity(_ context.Context, state shared_mpe.MpeRoomExposedState) error {
	marshaledBody, err := json.Marshal(state)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/mpe-creation-acknowledgement"

	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func (a *Activities) RejectAddingTracksActivity(ctx context.Context, args RejectAddingTracksActivityArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MPE_ENDPOINT + "/reject-adding-tracks"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func (a *Activities) AcknowledgeAddingTracksActivity(ctx context.Context, args AcknowledgeAddingTracksActivityArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MPE_ENDPOINT + "/acknowledge-adding-tracks"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}
