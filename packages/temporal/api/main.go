package main

import (
	"context"
	"encoding/json"
	"fmt"
	"hello-world-project-template-go/app"
	"log"
	"net/http"
	"os"
	"time"

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
	r.Handle("/ping", http.HandlerFunc(PingHandler)).Methods("GET")
	r.Handle("/control/{workflowID}/{runID}/play", http.HandlerFunc(PlayHandler)).Methods("PUT")
	r.Handle("/control/{workflowID}/{runID}/pause", http.HandlerFunc(PauseHandler)).Methods("PUT")
	r.Handle("/create/{workflowID}", http.HandlerFunc(CreateRoomHandler)).Methods("PUT")
	r.Handle("/state/{workflowID}/{runID}", http.HandlerFunc(GetStateHandler)).Methods("GET")

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
	update := app.PlaySignal{Route: app.RouteTypes.PLAY}

	workflowID := vars["workflowID"]
	runID := vars["runID"]
	err := temporal.SignalWorkflow(context.Background(), workflowID, runID, app.SignalChannelName, update)
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
	update := app.PlaySignal{Route: app.RouteTypes.PAUSE}

	workflowID := vars["workflowID"]
	runID := vars["runID"]
	err := temporal.SignalWorkflow(context.Background(), workflowID, runID, app.SignalChannelName, update)
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

func CreateRoomHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	fmt.Println("Create called")
	workflowID := vars["workflowID"]

	options := client.StartWorkflowOptions{
		ID:        workflowID,
		TaskQueue: app.ControlTaskQueue,
	}

	state := app.ControlState{
		Playing: false,
	}
	we, err := temporal.ExecuteWorkflow(context.Background(), options, app.ControlWorkflow, state)
	if err != nil {
		WriteError(w, err)
		return
	}

	res := make(map[string]interface{})
	res["state"] = state
	res["workflowID"] = we.GetID()
	res["runID"] = we.GetRunID()

	w.WriteHeader(http.StatusCreated)
	printResults("", workflowID, we.GetRunID())

	json.NewEncoder(w).Encode(res)
}

func GetStateHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	response, err := temporal.QueryWorkflow(context.Background(), vars["workflowID"], vars["runID"], "getState")
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
