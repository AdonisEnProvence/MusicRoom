package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"

	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	mpe "github.com/AdonisEnProvence/MusicRoom/mpe/workflows"
	shared_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/shared"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/gorilla/mux"
	"go.temporal.io/sdk/client"
)

func AddMpeHandler(r *mux.Router) {
	r.Handle("/mpe/create", AuthorizationMiddleware(http.HandlerFunc(createMpeRoomHandler))).Methods(http.MethodPut)
	r.Handle("/mpe/add-tracks", AuthorizationMiddleware(http.HandlerFunc(MpeAddTracksHandler))).Methods(http.MethodPut)
	r.Handle("/mpe/change-track-order", AuthorizationMiddleware(http.HandlerFunc(MpeChangeTrackOrderHandler))).Methods(http.MethodPut)
	r.Handle("/mpe/delete-tracks", AuthorizationMiddleware(http.HandlerFunc(MpeDeleteTracksHandler))).Methods(http.MethodPut)
	r.Handle("/mpe/get-state", AuthorizationMiddleware(http.HandlerFunc(getStateQueryHandler))).Methods(http.MethodPut)
	r.Handle("/mpe/join", AuthorizationMiddleware(http.HandlerFunc(MpeJoinHandler))).Methods(http.MethodPut)
	r.Handle("/mpe/leave", AuthorizationMiddleware(http.HandlerFunc(MpeLeaveHandler))).Methods(http.MethodPut)
	r.Handle("/mpe/export-to-mtv", AuthorizationMiddleware(http.HandlerFunc(MpeExportToMtvRoomHandler))).Methods(http.MethodPut)
	r.Handle("/mpe/terminate", AuthorizationMiddleware(http.HandlerFunc(MpeTerminateHandler))).Methods(http.MethodPut)
}

type MpeGetStateQueryRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	UserID     string `json:"userID" validate:"required,uuid"`
}

type MpeGetStateQueryResponse struct {
	State      shared_mpe.MpeRoomExposedState `json:"state"`
	WorkflowID string                         `json:"workflowID"`
}

func getStateQueryHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var body MpeGetStateQueryRequestBody

	err := json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		log.Println("create room body decode error", err)
		WriteError(w, err)
		return
	}

	fmt.Printf("mpe get context = %+v\n", body)

	if err := validate.Struct(body); err != nil {
		log.Println("create room validation error", err)
		WriteError(w, err)
		return
	}

	args := PerformMpeGetStateQueryArgs{
		WorkflowID: body.WorkflowID,
		RunID:      shared.NoWorkflowRunID,
		UserID:     body.UserID,
	}

	mpeRoomExposedState, err := PerformMpeGetStateQuery(args)
	if err != nil {
		WriteError(w, err)
		return
	}

	res := MpeGetStateQueryResponse{
		State:      mpeRoomExposedState,
		WorkflowID: mpeRoomExposedState.RoomID,
	}
	fmt.Printf("mpe get context response = %+v\n", res.State)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res)
}

type MpeCreateRoomRequestBody struct {
	WorkflowID     string `json:"workflowID" validate:"required,uuid"`
	UserID         string `json:"userID" validate:"required,uuid"`
	Name           string `json:"name" validate:"required"`
	InitialTrackID string `json:"initialTrackID" validate:"required"`

	IsOpen                        bool `json:"isOpen"`
	IsOpenOnlyInvitedUsersCanEdit bool `json:"isOpenOnlyInvitedUsersCanEdit"`
}

type MpeCreateRoomResponse struct {
	State      shared_mpe.MpeRoomExposedState `json:"state"`
	WorkflowID string                         `json:"workflowID"`
	RunID      string                         `json:"runID"`
}

func createMpeRoomHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var body MpeCreateRoomRequestBody

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
		TaskQueue: shared_mpe.ControlTaskQueue,
	}
	initialTrackID := body.InitialTrackID

	creatorUserRelatedInformation := &shared_mpe.InternalStateUser{
		UserID:             body.UserID,
		UserHasBeenInvited: true,
	}

	params := shared_mpe.MpeRoomParameters{
		RoomID:                        body.WorkflowID,
		RoomCreatorUserID:             body.UserID,
		RoomName:                      body.Name,
		CreatorUserRelatedInformation: creatorUserRelatedInformation,
		InitialTracksIDs:              []string{initialTrackID},
		IsOpen:                        body.IsOpen,
		IsOpenOnlyInvitedUsersCanEdit: body.IsOpenOnlyInvitedUsersCanEdit,
	}

	we, err := temporal.ExecuteWorkflow(context.Background(), options, mpe.MpeRoomWorkflow, params)
	if err != nil {
		WriteError(w, err)
		return
	}
	args := PerformMpeGetStateQueryArgs{
		WorkflowID: we.GetID(),
		RunID:      we.GetRunID(),
		UserID:     params.RoomCreatorUserID,
	}

	mpeRoomExposedState, err := PerformMpeGetStateQuery(args)
	if err != nil {
		WriteError(w, err)
		return
	}

	res := MpeCreateRoomResponse{
		State:      mpeRoomExposedState,
		WorkflowID: we.GetID(),
		RunID:      we.GetRunID(),
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res)
}

type MpeAddTracksRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`

	TracksIDs []string `json:"tracksIDs" validate:"required,dive,required"`
	UserID    string   `json:"userID" validate:"required"`
	DeviceID  string   `json:"deviceID" validate:"required"`
}

func MpeAddTracksHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body MpeAddTracksRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	signal := shared_mpe.NewAddTracksSignal(shared_mpe.NewAddTracksSignalArgs{
		TracksIDs: body.TracksIDs,
		UserID:    body.UserID,
		DeviceID:  body.DeviceID,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		shared.NoWorkflowRunID,
		shared_mpe.SignalChannelName,
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

type PerformMpeGetStateQueryArgs struct {
	WorkflowID string
	UserID     string
	RunID      string
}

func PerformMpeGetStateQuery(params PerformMpeGetStateQueryArgs) (shared_mpe.MpeRoomExposedState, error) {
	response, err := temporal.QueryWorkflow(context.Background(), params.WorkflowID, params.RunID, shared_mpe.MpeGetStateQuery, params.UserID)
	if err != nil {
		return shared_mpe.MpeRoomExposedState{}, err
	}
	var res shared_mpe.MpeRoomExposedState
	if err := response.Get(&res); err != nil {
		return shared_mpe.MpeRoomExposedState{}, err
	}

	return res, nil
}

type MpeChangeTrackOrderRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`

	TrackID          string                              `json:"trackID" validate:"required"`
	UserID           string                              `json:"userID" validate:"required"`
	DeviceID         string                              `json:"deviceID" validate:"required"`
	OperationToApply shared_mpe.MpeOperationToApplyValue `json:"operationToApply" validate:"required"`
	FromIndex        int                                 `json:"fromIndex" validate:"min=0"`
}

func MpeChangeTrackOrderHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body MpeChangeTrackOrderRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	operationToApplyIsNotValid := !body.OperationToApply.IsValid()
	if operationToApplyIsNotValid {
		WriteError(w, errors.New("OperationToApplyValue is invalid"))
		return
	}

	signal := shared_mpe.NewChangeTrackOrderSignal(shared_mpe.NewChangeTrackOrderSignalArgs{
		DeviceID:         body.DeviceID,
		OperationToApply: body.OperationToApply,
		TrackID:          body.TrackID,
		UserID:           body.UserID,
		FromIndex:        body.FromIndex,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		shared.NoWorkflowRunID,
		shared_mpe.SignalChannelName,
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

type MpeDeleteTracksRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`

	TracksIDs []string `json:"tracksIDs" validate:"required,dive,required"`
	UserID    string   `json:"userID" validate:"required,uuid"`
	DeviceID  string   `json:"deviceID" validate:"required,uuid"`
}

func MpeDeleteTracksHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body MpeDeleteTracksRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	signal := shared_mpe.NewDeleteTracksSignal(shared_mpe.NewDeleteTracksSignalArgs{
		TracksIDs: body.TracksIDs,
		UserID:    body.UserID,
		DeviceID:  body.DeviceID,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		shared.NoWorkflowRunID,
		shared_mpe.SignalChannelName,
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

type MpeJoinRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`

	UserID             string `json:"userID" validate:"required,uuid"`
	UserHasBeenInvited bool   `json:"userHasBeenInvited"`
}

func MpeJoinHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body MpeJoinRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	signal := shared_mpe.NewAddUserSignal(shared_mpe.NewAddUserSignalArgs{
		UserID:             body.UserID,
		UserHasBeenInvited: body.UserHasBeenInvited,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		shared.NoWorkflowRunID,
		shared_mpe.SignalChannelName,
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

type MpeLeaveRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`

	UserID string `json:"userID" validate:"required,uuid"`
}

func MpeLeaveHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body MpeLeaveRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	signal := shared_mpe.NewRemoveUserSignal(shared_mpe.NewRemoveUserSignalArgs{
		UserID: body.UserID,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		shared.NoWorkflowRunID,
		shared_mpe.SignalChannelName,
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

type MpeExportToMtvRoomRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`

	UserID         string                                                 `json:"userID" validate:"required,uuid"`
	DeviceID       string                                                 `json:"deviceID" validate:"required,uuid"`
	MtvRoomOptions shared_mtv.MtvRoomCreationOptionsFromExportWithPlaceID `json:"mtvRoomOptions" validate:"required"`
}

func MpeExportToMtvRoomHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body MpeExportToMtvRoomRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}

	fmt.Printf("%+v", body.MtvRoomOptions.PhysicalAndTimeConstraints)
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	signal := shared_mpe.NewExportToMtvRoomSignal(shared_mpe.ExportToMtvRoomSignalArgs{
		UserID:         body.UserID,
		DeviceID:       body.DeviceID,
		MtvRoomOptions: body.MtvRoomOptions,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		shared.NoWorkflowRunID,
		shared_mpe.SignalChannelName,
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

type MpeTerminateRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
}

func MpeTerminateHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body MpeTerminateRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	signal := shared_mpe.NewTerminateWorkflowSignal()
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		shared.NoWorkflowRunID,
		shared_mpe.SignalChannelName,
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
