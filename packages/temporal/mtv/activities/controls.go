package activities_mtv

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"

	activities "github.com/AdonisEnProvence/MusicRoom/activities"
	shared_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/shared"
)

func (a *Activities) PauseActivity(_ context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/pause"

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

func (a *Activities) PlayActivity(_ context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/play"
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

func (a *Activities) CreationAcknowledgementActivity(_ context.Context, state shared_mtv.MtvRoomExposedState) error {
	marshaledBody, err := json.Marshal(state)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/mtv-creation-acknowledgement"

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

// As we removed a user we need to send back the new UserLength value to every others clients
// Calculated in the internalState.Export()
func (a *Activities) UserLengthUpdateActivity(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	marshaledBody, err := json.Marshal(state)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/user-length-update"
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

type MtvJoinCallbackRequestBody struct {
	State         shared_mtv.MtvRoomExposedState `json:"state"`
	JoiningUserID string                         `json:"joiningUserID"`
}

func (a *Activities) JoinActivity(ctx context.Context, args MtvJoinCallbackRequestBody) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/join"
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

type AcknowledgeLeaveRoomRequestBody struct {
	State         shared_mtv.MtvRoomExposedState `json:"state"`
	LeavingUserID string                         `json:"leavingUserID"`
}

func (a *Activities) LeaveActivity(ctx context.Context, args AcknowledgeLeaveRoomRequestBody) error {
	requestBody := AcknowledgeLeaveRoomRequestBody{
		State:         args.State,
		LeavingUserID: args.LeavingUserID,
	}

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/leave"
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

func (a *Activities) UserVoteForTrackAcknowledgement(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/acknowledge-user-vote-for-track"
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

func (a *Activities) ChangeUserEmittingDeviceActivity(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/change-user-emitting-device"
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

func (a *Activities) NotifySuggestOrVoteUpdateActivity(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/suggest-or-vote-update"
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

type AcknowledgeTracksSuggestionArgs struct {
	State    shared_mtv.MtvRoomExposedState `json:"state"`
	DeviceID string                         `json:"deviceID"`
}

func (a *Activities) AcknowledgeTracksSuggestion(ctx context.Context, args AcknowledgeTracksSuggestionArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/acknowledge-tracks-suggestion"
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

type AcknowledgeTracksSuggestionFailArgs struct {
	DeviceID string `json:"deviceID"`
}

func (a *Activities) AcknowledgeTracksSuggestionFail(ctx context.Context, args AcknowledgeTracksSuggestionFailArgs) error {
	requestBody := args

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/acknowledge-tracks-suggestion-fail"
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

func (a *Activities) AcknowledgeUpdateUserFitsPositionConstraint(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/acknowledge-update-user-fits-position-constraint"
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

func (a *Activities) AcknowledgeUpdateDelegationOwner(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/acknowledge-update-delegation-owner"
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

func (a *Activities) AcknowledgeUpdateControlAndDelegationPermission(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/acknowledge-update-control-and-delegation-permission"
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

func (a *Activities) AcknowledgeUpdateTimeConstraint(ctx context.Context, state shared_mtv.MtvRoomExposedState) error {
	requestBody := state

	marshaledBody, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/acknowledge-update-time-constraint"
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
