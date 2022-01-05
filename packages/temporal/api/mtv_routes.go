package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	shared_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/shared"
	mtv "github.com/AdonisEnProvence/MusicRoom/mtv/workflows"
	"github.com/gorilla/mux"
	"go.temporal.io/sdk/client"
)

func AddMtvHandler(r *mux.Router) {
	r.Handle("/mtv/play", http.HandlerFunc(PlayHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/pause", http.HandlerFunc(PauseHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/create", http.HandlerFunc(CreateRoomHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/join", http.HandlerFunc(JoinRoomHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/vote-for-track", http.HandlerFunc(VoteForTrackHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/leave", http.HandlerFunc(LeaveRoomHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/change-user-emitting-device", http.HandlerFunc(ChangeUserEmittingDeviceHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/update-user-fits-position-constraint", http.HandlerFunc(UpdateUserFitsPositionConstraintHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/go-to-next-track", http.HandlerFunc(GoToNextTrackHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/suggest-tracks", http.HandlerFunc(SuggestTracksHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/terminate", http.HandlerFunc(TerminateWorkflowHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/update-delegation-owner", http.HandlerFunc(UpdateDelegationOwnerHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/update-control-and-delegation-permission", http.HandlerFunc(UpdateControlAndDelegationPermissionHandler)).Methods(http.MethodPut)
	//Queries
	r.Handle("/mtv/room-constraints-details", http.HandlerFunc(GetRoomConstraintsDetailsHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/state", http.HandlerFunc(GetStateHandler)).Methods(http.MethodPut)
	r.Handle("/mtv/users-list", http.HandlerFunc(GetUsersListHandler)).Methods(http.MethodPut)
}

type PlayRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
	UserID     string `json:"userID" validate:"required,uuid"`
}

func PlayHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body PlayRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	signal := shared_mtv.NewPlaySignal(shared_mtv.NewPlaySignalArgs{
		UserID: body.UserID,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared_mtv.SignalChannelName,
		signal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type PauseRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
	UserID     string `json:"userID" validate:"required,uuid"`
}

func PauseHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body PauseRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	signal := shared_mtv.NewPauseSignal(shared_mtv.NewPauseSignalArgs{
		UserID: body.UserID,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared_mtv.SignalChannelName,
		signal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type GoToNextTrackRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
	UserID     string `json:"userID" validate:"required,uuid"`
}

func GoToNextTrackHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body GoToNextTrackRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	goToNextTrackSignal := shared_mtv.NewGoToNexTrackSignal(shared_mtv.NewGoToNextTrackSignalArgs{
		UserID: body.UserID,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared_mtv.SignalChannelName,
		goToNextTrackSignal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type VoteForTrackHandlerRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
	TrackID    string `json:"trackID" validate:"required"`
	UserID     string `json:"userID" validate:"required,uuid"`
}

func VoteForTrackHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body VoteForTrackHandlerRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	voteForTrackSignal := shared_mtv.NewVoteForTrackSignal(shared_mtv.NewVoteForTrackSignalArgs{
		TrackID: body.TrackID,
		UserID:  body.UserID,
	})

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared_mtv.SignalChannelName,
		voteForTrackSignal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type ChangeUserEmittingDeviceRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
	UserID     string `json:"userID" validate:"required,uuid"`
	DeviceID   string `json:"deviceID" validate:"required,uuid"`
}

func ChangeUserEmittingDeviceHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body ChangeUserEmittingDeviceRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	args := shared_mtv.ChangeUserEmittingDeviceSignalArgs{
		UserID:   body.UserID,
		DeviceID: body.DeviceID,
	}
	changeUserEmittingDeviceSignal := shared_mtv.NewChangeUserEmittingDeviceSignal(args)

	fmt.Println("**********ChangeUserEmittingDeviceHandler**********")

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared_mtv.SignalChannelName,
		changeUserEmittingDeviceSignal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type SuggestTracksRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`

	TracksToSuggest []string `json:"tracksToSuggest" validate:"required,dive,required"`
	UserID          string   `json:"userID" validate:"required,uuid"`
	DeviceID        string   `json:"deviceID" validate:"required,uuid"`
}

func SuggestTracksHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body SuggestTracksRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	suggestTracksSignal := shared_mtv.NewSuggestTracksSignal(shared_mtv.SuggestTracksSignalArgs{
		TracksToSuggest: body.TracksToSuggest,
		UserID:          body.UserID,
		DeviceID:        body.DeviceID,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared_mtv.SignalChannelName,
		suggestTracksSignal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type TerminateWorkflowRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
}

func TerminateWorkflowHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body TerminateWorkflowRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	terminateSignal := shared_mtv.NewTerminateSignal(shared_mtv.NewTerminateSignalArgs{})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared_mtv.SignalChannelName,
		terminateSignal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type CreateRoomRequestBody struct {
	WorkflowID                    string   `json:"workflowID" validate:"required,uuid"`
	UserID                        string   `json:"userID" validate:"required,uuid"`
	DeviceID                      string   `json:"deviceID" validate:"required,uuid"`
	Name                          string   `json:"name" validate:"required"`
	InitialTracksIDs              []string `json:"initialTracksIDs" validate:"required,dive,required"`
	CreatorFitsPositionConstraint *bool    `json:"creatorFitsPositionConstraint"`

	MinimumScoreToBePlayed        int                                           `json:"minimumScoreToBePlayed" validate:"required"`
	IsOpen                        bool                                          `json:"isOpen"`
	IsOpenOnlyInvitedUsersCanVote bool                                          `json:"isOpenOnlyInvitedUsersCanVote"`
	HasPhysicalAndTimeConstraints bool                                          `json:"hasPhysicalAndTimeConstraints"`
	PhysicalAndTimeConstraints    *shared_mtv.MtvRoomPhysicalAndTimeConstraints `json:"physicalAndTimeConstraints" validate:"required_if=HasPhysicalAndTimeConstraints true"`
	PlayingMode                   shared_mtv.MtvPlayingModes                    `json:"playingMode" validate:"required"`
}

type CreateRoomResponse struct {
	State      shared_mtv.MtvRoomExposedState `json:"state"`
	WorkflowID string                         `json:"workflowID"`
	RunID      string                         `json:"runID"`
}

func CreateRoomHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var body CreateRoomRequestBody

	err := json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		log.Println("create room body decode error", err)
		WriteError(w, err)
		return
	}

	fmt.Printf("received body from server is = %+v\n", body)

	if err := validate.Struct(body); err != nil {
		log.Println("create room validation error", err)
		WriteError(w, err)
		return
	}

	options := client.StartWorkflowOptions{
		ID:        body.WorkflowID,
		TaskQueue: shared_mtv.ControlTaskQueue,
	}
	initialTracksIDsList := body.InitialTracksIDs

	creatorUserRelatedInformation := &shared_mtv.InternalStateUser{
		UserID:                            body.UserID,
		DeviceID:                          body.DeviceID,
		TracksVotedFor:                    make([]string, 0),
		UserFitsPositionConstraint:        nil,
		HasControlAndDelegationPermission: true,
		UserHasBeenInvited:                false,
	}

	if body.HasPhysicalAndTimeConstraints && body.PhysicalAndTimeConstraints != nil {
		creatorUserRelatedInformation.UserFitsPositionConstraint = body.CreatorFitsPositionConstraint
	}

	params := shared_mtv.MtvRoomParameters{
		RoomID:                        body.WorkflowID,
		RoomCreatorUserID:             body.UserID,
		CreatorUserRelatedInformation: creatorUserRelatedInformation,
		InitialTracksIDsList:          initialTracksIDsList,

		MtvRoomCreationOptions: shared_mtv.MtvRoomCreationOptions{
			RoomName:                      body.Name,
			MinimumScoreToBePlayed:        body.MinimumScoreToBePlayed,
			IsOpen:                        body.IsOpen,
			IsOpenOnlyInvitedUsersCanVote: body.IsOpenOnlyInvitedUsersCanVote,
			HasPhysicalAndTimeConstraints: body.HasPhysicalAndTimeConstraints,
			PhysicalAndTimeConstraints:    nil,
			PlayingMode:                   body.PlayingMode,
		},
	}

	if body.PhysicalAndTimeConstraints != nil {
		params.PhysicalAndTimeConstraints = body.PhysicalAndTimeConstraints
	}

	we, err := temporal.ExecuteWorkflow(context.Background(), options, mtv.MtvRoomWorkflow, params)
	if err != nil {
		WriteError(w, err)
		return
	}
	args := PerformMtvGetStateQueryArgs{
		WorkflowID: we.GetID(),
		RunID:      we.GetRunID(),
		UserID:     params.RoomCreatorUserID,
	}

	mtvRoomExposedState, err := PerformMtvGetStateQuery(args)
	if err != nil {
		WriteError(w, err)
		return
	}

	res := CreateRoomResponse{
		State:      mtvRoomExposedState,
		WorkflowID: we.GetID(),
		RunID:      we.GetRunID(),
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res)
}

type LeaveRoomHandlerBody struct {
	UserID     string `json:"userID" validate:"required,uuid"`
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
}

func LeaveRoomHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body LeaveRoomHandlerBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		fmt.Println("Leave room failed on decode body", err)
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		fmt.Println("Leave room failed on validator body", err)
		WriteError(w, err)
		return
	}

	signal := shared_mtv.NewLeaveSignal(shared_mtv.NewLeaveSignalArgs{
		UserID: body.UserID,
	})

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared_mtv.SignalChannelName,
		signal,
	); err != nil {
		fmt.Println("Couldnt send the signal to temporal", err)
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type JoinRoomHandlerBody struct {
	UserID             string `json:"userID" validate:"required,uuid"`
	DeviceID           string `json:"deviceID" validate:"required,uuid"`
	WorkflowID         string `json:"workflowID" validate:"required,uuid"`
	RunID              string `json:"runID" validate:"required,uuid"`
	UserHasBeenInvited bool   `json:"userHasBeenInvited"`
}

func JoinRoomHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body JoinRoomHandlerBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	signal := shared_mtv.NewJoinSignal(shared_mtv.NewJoinSignalArgs{
		UserID:             body.UserID,
		DeviceID:           body.DeviceID,
		UserHasBeenInvited: body.UserHasBeenInvited,
	})

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared_mtv.SignalChannelName,
		signal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)

}

type UpdateUserFitsPositionConstraintHandlerBody struct {
	UserID                     string `json:"userID" validate:"required,uuid"`
	WorkflowID                 string `json:"workflowID" validate:"required,uuid"`
	RunID                      string `json:"runID" validate:"required,uuid"`
	UserFitsPositionConstraint bool   `json:"userFitsPositionConstraint"`
}

func UpdateUserFitsPositionConstraintHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body UpdateUserFitsPositionConstraintHandlerBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		fmt.Println(err)
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		fmt.Println(err)
		WriteError(w, err)
		return
	}

	signal := shared_mtv.NewUpdateUserFitsPositionConstraintSignal(shared_mtv.NewUpdateUserFitsPositionConstraintSignalArgs{
		UserID:                     body.UserID,
		UserFitsPositionConstraint: body.UserFitsPositionConstraint,
	})

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared_mtv.SignalChannelName,
		signal,
	); err != nil {
		fmt.Println(err)

		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)

}

type UpdateDelegationOwnerHandlerBody struct {
	WorkflowID               string `json:"workflowID" validate:"required,uuid"`
	RunID                    string `json:"runID" validate:"required,uuid"`
	NewDelegationOwnerUserID string `json:"newDelegationOwnerUserID" validate:"required,uuid"`
	EmitterUserID            string `json:"emitterUserID" validate:"required,uuid"`
}

func UpdateDelegationOwnerHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body UpdateDelegationOwnerHandlerBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		fmt.Println(err)
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		fmt.Println(err)
		WriteError(w, err)
		return
	}

	signal := shared_mtv.NewUpdateDelegationOwnerSignal(shared_mtv.NewUpdateDelegationOwnerSignalArgs{
		NewDelegationOwnerUserID: body.NewDelegationOwnerUserID,
		EmitterUserID:            body.EmitterUserID,
	})

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared_mtv.SignalChannelName,
		signal,
	); err != nil {
		fmt.Println(err)

		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)

}

type UpdateControlAndDelegationPermissionHandlerBody struct {
	WorkflowID                        string `json:"workflowID" validate:"required,uuid"`
	RunID                             string `json:"runID" validate:"required,uuid"`
	ToUpdateUserID                    string `json:"toUpdateUserID" validate:"required,uuid"`
	HasControlAndDelegationPermission bool   `json:"hasControlAndDelegationPermission"`
}

func UpdateControlAndDelegationPermissionHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body UpdateControlAndDelegationPermissionHandlerBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		fmt.Println(err)
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		fmt.Println(err)
		WriteError(w, err)
		return
	}

	signal := shared_mtv.NewUpdateControlAndDelegationPermissionSignal(shared_mtv.NewUpdateControlAndDelegationPermissionSignalArgs{
		ToUpdateUserID:                    body.ToUpdateUserID,
		HasControlAndDelegationPermission: body.HasControlAndDelegationPermission,
	})

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared_mtv.SignalChannelName,
		signal,
	); err != nil {
		fmt.Println(err)

		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type PerformMtvGetStateQueryArgs struct {
	WorkflowID string
	UserID     string
	RunID      string
}

func PerformMtvGetStateQuery(params PerformMtvGetStateQueryArgs) (shared_mtv.MtvRoomExposedState, error) {
	response, err := temporal.QueryWorkflow(context.Background(), params.WorkflowID, params.RunID, shared_mtv.MtvGetStateQuery, params.UserID)
	if err != nil {
		return shared_mtv.MtvRoomExposedState{}, err
	}
	var res shared_mtv.MtvRoomExposedState
	if err := response.Get(&res); err != nil {
		return shared_mtv.MtvRoomExposedState{}, err
	}

	return res, nil
}

type GetStateBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	UserID     string `json:"userID,omitempty" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
}

func GetStateHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body GetStateBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	//Json marshall will set body.UserID default golang string value if it's empty
	args := PerformMtvGetStateQueryArgs{
		RunID:      body.RunID,
		UserID:     body.UserID,
		WorkflowID: body.WorkflowID,
	}

	res, err := PerformMtvGetStateQuery(args)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

type GetRoomConstraintsDetailsBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
}

func GetRoomConstraintsDetailsHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body GetRoomConstraintsDetailsBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	response, err := temporal.QueryWorkflow(context.Background(), body.WorkflowID, body.RunID, shared_mtv.MtvGetRoomConstraintsDetails)
	if err != nil {
		WriteError(w, err)
		return
	}
	var res shared_mtv.MtvRoomConstraintsDetails
	if err := response.Get(&res); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

type GetUsersListBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
}

func GetUsersListHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body GetUsersListBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	response, err := temporal.QueryWorkflow(context.Background(), body.WorkflowID, body.RunID, shared_mtv.MtvGetUsersListQuery)
	if err != nil {
		WriteError(w, err)
		return
	}
	var res []shared_mtv.ExposedInternalStateUserListElement
	if err := response.Get(&res); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}
