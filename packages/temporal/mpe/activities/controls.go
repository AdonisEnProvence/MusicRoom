package activities_mpe

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"

	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	shared_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/shared"
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

	url := ADONIS_MPE_ENDPOINT + "/mpe-creation-acknowledgement"

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(marshaledBody))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", os.Getenv("TEMPORAL_ADONIS_KEY"))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	_, err = client.Do(req)

	return err
}

func (a *Activities) RejectAddingTracksActivity(ctx context.Context, args RejectAddingTracksActivityArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MPE_ENDPOINT + "/reject-adding-tracks"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(marshaledBody))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", os.Getenv("TEMPORAL_ADONIS_KEY"))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	_, err = client.Do(req)

	return err
}

func (a *Activities) AcknowledgeAddingTracksActivity(ctx context.Context, args AcknowledgeAddingTracksActivityArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MPE_ENDPOINT + "/acknowledge-adding-tracks"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(marshaledBody))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", os.Getenv("TEMPORAL_ADONIS_KEY"))
	client := &http.Client{}
	_, err = client.Do(req)

	return err
}

type RejectChangeTrackOrderActivityArgs struct {
	DeviceID string `json:"deviceID"`
	UserID   string `json:"userID"`
	RoomID   string `json:"roomID"`
}

type AcknowledgeChangeTrackOrderActivityArgs struct {
	State    shared_mpe.MpeRoomExposedState `json:"state"`
	DeviceID string                         `json:"deviceID"`
	UserID   string                         `json:"userID"`
}

type AcknowledgeDeletingTracksActivityArgs struct {
	State    shared_mpe.MpeRoomExposedState `json:"state"`
	DeviceID string                         `json:"deviceID"`
	UserID   string                         `json:"userID"`
}

type AcknowledgeJoinActivityArgs struct {
	State         shared_mpe.MpeRoomExposedState `json:"state"`
	JoiningUserID string                         `json:"joiningUserID"`
}

func (a *Activities) AcknowledgeChangeTrackOrderActivity(ctx context.Context, args AcknowledgeChangeTrackOrderActivityArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MPE_ENDPOINT + "/acknowledge-change-track-order"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(marshaledBody))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", os.Getenv("TEMPORAL_ADONIS_KEY"))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	_, err = client.Do(req)

	return err
}

func (a *Activities) RejectChangeTrackOrderActivity(ctx context.Context, args RejectChangeTrackOrderActivityArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MPE_ENDPOINT + "/reject-change-track-order"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(marshaledBody))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", os.Getenv("TEMPORAL_ADONIS_KEY"))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	_, err = client.Do(req)

	return err
}

func (a *Activities) AcknowledgeDeletingTracksActivity(ctx context.Context, args AcknowledgeDeletingTracksActivityArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MPE_ENDPOINT + "/acknowledge-deleting-tracks"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(marshaledBody))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", os.Getenv("TEMPORAL_ADONIS_KEY"))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	_, err = client.Do(req)

	return err
}

func (a *Activities) AcknowledgeJoinActivity(ctx context.Context, args AcknowledgeJoinActivityArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MPE_ENDPOINT + "/acknowledge-join"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(marshaledBody))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", os.Getenv("TEMPORAL_ADONIS_KEY"))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	_, err = client.Do(req)

	return err
}

type AcknowledgeLeaveActivityArgs struct {
	State         shared_mpe.MpeRoomExposedState `json:"state"`
	LeavingUserID string                         `json:"leavingUserID"`
}

func (a *Activities) AcknowledgeLeaveActivity(ctx context.Context, args AcknowledgeLeaveActivityArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MPE_ENDPOINT + "/acknowledge-leave"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(marshaledBody))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", os.Getenv("TEMPORAL_ADONIS_KEY"))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	_, err = client.Do(req)

	return err
}

type SendMtvRoomCreationRequestToServerActivityArgs struct {
	TracksIDs      []string                                               `json:"tracksIDs"`
	UserID         string                                                 `json:"userID"`
	DeviceID       string                                                 `json:"deviceID"`
	MtvRoomOptions shared_mtv.MtvRoomCreationOptionsFromExportWithPlaceID `json:"mtvRoomOptions"`
}

func (a *Activities) SendMtvRoomCreationRequestToServerActivity(ctx context.Context, args SendMtvRoomCreationRequestToServerActivityArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MPE_ENDPOINT + "/request-mtv-room-creation"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(marshaledBody))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", os.Getenv("TEMPORAL_ADONIS_KEY"))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	_, err = client.Do(req)

	return err
}
