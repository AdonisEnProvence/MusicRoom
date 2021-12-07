package activities

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"

	shared_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/shared"
)

func PingActivity(_ context.Context) error {
	_, err := http.Get(ADONIS_ENDPOINT + "/ping")

	return err
}

func PauseActivity(_ context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/pause"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func PlayActivity(_ context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/play"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func CreationAcknowledgementActivity(_ context.Context, state shared_mtv.MtvRoomExposedState) error {
	marshaledBody, err := json.Marshal(state)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/mtv-creation-acknowledgement"

	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

// As we removed a user we need to send back the new UserLength value to every others clients
// Calculated in the internalState.Export()
func UserLengthUpdateActivity(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	marshaledBody, err := json.Marshal(state)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/user-length-update"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

type MtvJoinCallbackRequestBody struct {
	State         shared_mtv.MtvRoomExposedState `json:"state"`
	JoiningUserID string                         `json:"joiningUserID"`
}

func JoinActivity(ctx context.Context, args MtvJoinCallbackRequestBody) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/join"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

type AcknowledgeLeaveRoomRequestBody struct {
	State         shared_mtv.MtvRoomExposedState `json:"state"`
	LeavingUserID string                         `json:"leavingUserID"`
}

func LeaveActivity(ctx context.Context, args AcknowledgeLeaveRoomRequestBody) error {
	requestBody := AcknowledgeLeaveRoomRequestBody{
		State:         args.State,
		LeavingUserID: args.LeavingUserID,
	}

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/leave"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func UserVoteForTrackAcknowledgement(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/acknowledge-user-vote-for-track"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func ChangeUserEmittingDeviceActivity(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/change-user-emitting-device"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func NotifySuggestOrVoteUpdateActivity(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/suggest-or-vote-update"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

type AcknowledgeTracksSuggestionArgs struct {
	State    shared_mtv.MtvRoomExposedState `json:"state"`
	DeviceID string                         `json:"deviceID"`
}

func AcknowledgeTracksSuggestion(ctx context.Context, args AcknowledgeTracksSuggestionArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/acknowledge-tracks-suggestion"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

type AcknowledgeTracksSuggestionFailArgs struct {
	DeviceID string `json:"deviceID"`
}

func AcknowledgeTracksSuggestionFail(ctx context.Context, args AcknowledgeTracksSuggestionFailArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/acknowledge-tracks-suggestion-fail"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func AcknowledgeUpdateUserFitsPositionConstraint(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/acknowledge-update-user-fits-position-constraint"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func AcknowledgeUpdateDelegationOwner(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/acknowledge-update-delegation-owner"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func AcknowledgeUpdateControlAndDelegationPermission(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/acknowledge-update-control-and-delegation-permission"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}

func AcknowledgeUpdateTimeConstraint(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := ADONIS_MTV_ENDPOINT + "/acknowledge-update-time-constraint"
	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}
