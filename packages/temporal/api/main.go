package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/AdonisEnProvence/MusicRoom/workflows"

	"github.com/bojanz/httpx"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"go.temporal.io/sdk/client"
)

type (
	ErrorResponse struct {
		Message string
	}

	UpdateEmailRequest struct {
		Email string
	}

	CheckoutRequest struct {
		Email string
	}
)

var (
	HTTPPort = os.Getenv("PORT")
	temporal client.Client
)

func main() {
	var err error
	temporal, err = client.NewClient(client.Options{})
	if err != nil {
		log.Fatalln("unable to create Temporal client", err)
	}

	r := mux.NewRouter()
	r.Handle("/ping", http.HandlerFunc(PingHandler)).Methods(http.MethodGet)
	r.Handle("/control/{workflowID}/{runID}/play", http.HandlerFunc(PlayHandler)).Methods(http.MethodPut)
	r.Handle("/control/{workflowID}/{runID}/pause", http.HandlerFunc(PauseHandler)).Methods(http.MethodPut)
	r.Handle("/create/{workflowID}", http.HandlerFunc(CreateRoomHandler)).Methods(http.MethodPut)
	r.Handle("/join", http.HandlerFunc(JoinRoomHandler)).Methods(http.MethodPut)
	r.Handle("/change-user-emitting-device", http.HandlerFunc(ChangeUserEmittingDeviceHandler)).Methods(http.MethodPut)
	r.Handle("/state", http.HandlerFunc(GetStateHandler)).Methods(http.MethodGet)
	r.Handle("/go-to-next-track", http.HandlerFunc(GoToNextTrackHandler)).Methods(http.MethodPut)
	r.Handle("/terminate/{workflowID}/{runID}", http.HandlerFunc(TerminateWorkflowHandler)).Methods(http.MethodGet)

	r.NotFoundHandler = http.HandlerFunc(NotFoundHandler)

	var cors = handlers.CORS(handlers.AllowedHeaders([]string{"X-Requested-With", "Content-Type", "Authorization"}), handlers.AllowedMethods([]string{"GET", "POST", "PUT", "HEAD", "OPTIONS"}), handlers.AllowedOrigins([]string{"*"}))

	http.Handle("/", cors(r))
	server := httpx.NewServer(":"+HTTPPort, http.DefaultServeMux)
	server.WriteTimeout = time.Second * 240

	fmt.Println("Server is listening on PORT: " + os.Getenv("PORT"))
	err = server.Start()
	if err != nil {
		log.Fatal(err)
	}
}

func PlayHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Control called")
	vars := mux.Vars(r)
	workflowID := vars["workflowID"]
	runID := vars["runID"]

	signal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})
	err := temporal.SignalWorkflow(context.Background(), workflowID, runID, shared.SignalChannelName, signal)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	printResults("", workflowID, runID)
	json.NewEncoder(w).Encode(res)
}

type GoToNextTrackRequestBody struct {
	WorkflowID string `json:"workflowID"`
	RunID      string `json:"runID"`
}

func GoToNextTrackHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body GoToNextTrackRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}

	goToNextTrackSignal := shared.NewGoToNexTrackSignal()
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
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

type ChangeUserEmittingDeviceRequestBody struct {
	WorkflowID string `json:"workflowID"`
	RunID      string `json:"runID"`
	UserID     string `json:"userID"`
	DeviceID   string `json:"deviceID"`
}

func ChangeUserEmittingDeviceHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body ChangeUserEmittingDeviceRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}

	args := shared.ChangeUserEmittingDeviceSignalArgs{
		UserID:   body.UserID,
		DeviceID: body.DeviceID,
	}
	changeUserEmittingDeviceSignal := shared.NewChangeUserEmittingDeviceSignal(args)

	fmt.Println("**********ChangeUserEmittingDeviceHandler**********")

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
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

func TerminateWorkflowHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Control called")
	vars := mux.Vars(r)

	workflowID := vars["workflowID"]
	runID := vars["runID"]
	terminateSignal := shared.NewTerminateSignal(shared.NewTerminateSignalArgs{})
	err := temporal.SignalWorkflow(context.Background(), workflowID, runID, shared.SignalChannelName, terminateSignal)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	printResults("", workflowID, runID)
	json.NewEncoder(w).Encode(res)
}

func PauseHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Control called")
	vars := mux.Vars(r)
	workflowID := vars["workflowID"]
	runID := vars["runID"]

	signal := shared.NewPauseSignal(shared.NewPauseSignalArgs{})
	err := temporal.SignalWorkflow(context.Background(), workflowID, runID, shared.SignalChannelName, signal)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	printResults("", workflowID, runID)
	json.NewEncoder(w).Encode(res)
}

type CreateRoomRequestBody struct {
	UserID           string   `json:"userID"`
	DeviceID         string   `json:"deviceID"`
	Name             string   `json:"roomName"`
	InitialTracksIDs []string `json:"initialTracksIDs"`
}

type CreateRoomResponse struct {
	State      shared.MtvRoomExposedState `json:"state"`
	WorkflowID string                     `json:"workflowID"`
	RunID      string                     `json:"runID"`
}

func CreateRoomHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Create called")
	defer r.Body.Close()

	vars := mux.Vars(r)
	var body CreateRoomRequestBody

	err := json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		WriteError(w, err)
		return
	}

	workflowID, err := url.QueryUnescape(vars["workflowID"])
	if err != nil {
		WriteError(w, err)
		return
	}

	options := client.StartWorkflowOptions{
		ID:        workflowID,
		TaskQueue: shared.ControlTaskQueue,
	}

	seedTracksIDs := []string{
		"JK7WLK3ZSu8",
		"9Tfciw7QM3c",
		"H3s1mt7aFlc",
	}
	initialTracksIDsList := append(body.InitialTracksIDs, seedTracksIDs...)

	initialUsers := make(map[string]*shared.InternalStateUser)
	initialUsers[body.UserID] = &shared.InternalStateUser{
		UserID:   body.UserID,
		DeviceID: body.DeviceID,
	}

	params := shared.MtvRoomParameters{
		RoomID:               workflowID,
		RoomCreatorUserID:    body.UserID,
		RoomName:             body.Name,
		InitialUsers:         initialUsers,
		InitialTracksIDsList: initialTracksIDsList,
	}

	we, err := temporal.ExecuteWorkflow(context.Background(), options, workflows.MtvRoomWorkflow, params)
	if err != nil {
		WriteError(w, err)
		return
	}

	res := CreateRoomResponse{
		State:      params.Export(),
		WorkflowID: we.GetID(),
		RunID:      we.GetRunID(),
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res)
}

type UnescapeRoomIDAndRundIDResponse struct {
	worflowID, runID string
}

func UnescapeRoomIDAndRundID(workflowID, runID string) (UnescapeRoomIDAndRundIDResponse, error) {
	workflowID, err := url.QueryUnescape(workflowID)
	if err != nil {
		return UnescapeRoomIDAndRundIDResponse{}, err
	}
	runID, err = url.QueryUnescape(runID)
	if err != nil {
		return UnescapeRoomIDAndRundIDResponse{}, err
	}
	return UnescapeRoomIDAndRundIDResponse{
		workflowID,
		runID,
	}, nil
}

type JoinRoomHandlerBody struct {
	UserID     string `json:"userID"`
	DeviceID   string `json:"deviceID"`
	WorkflowID string `json:"workflowID"`
	RunID      string `json:"runID"`
}

func JoinRoomHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body JoinRoomHandlerBody
	err := json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		WriteError(w, err)
		return
	}

	signal := shared.NewJoinSignal(shared.NewJoinSignalArgs{
		UserID:   body.UserID,
		DeviceID: body.DeviceID,
	})

	err = temporal.SignalWorkflow(context.Background(), body.WorkflowID, body.RunID, shared.SignalChannelName, signal)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type GetStateBody struct {
	WorkflowID string `json:"workflowID"`
	UserID     string `json:"userID,omitempty"`
	RunID      string `json:"runID"`
}

func GetStateHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body GetStateBody

	err := json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		WriteError(w, err)
		return
	}
	fmt.Printf("\n ________________GETSTATE Getting body = %+v\n", body)

	response, err := temporal.QueryWorkflow(context.Background(), body.WorkflowID, body.RunID, shared.MtvGetStateQuery, body.UserID)
	if err != nil {
		WriteError(w, err)
		return
	}
	var res interface{}
	if err := response.Get(&res); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

func PingHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Pong")
}

func printResults(greeting string, workflowID, runID string) {
	fmt.Printf("\nWorkflowID: %s RunID: %s\n", workflowID, runID)
	fmt.Printf("\n%s\n\n", greeting)
}

func WriteError(w http.ResponseWriter, err error) {
	w.WriteHeader(http.StatusInternalServerError)
	res := ErrorResponse{Message: err.Error()}
	json.NewEncoder(w).Encode(res)
}

func NotFoundHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)
	res := ErrorResponse{Message: "Endpoint not found"}
	json.NewEncoder(w).Encode(res)
}
