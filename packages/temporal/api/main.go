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
	// temporal client.Client
)

func main() {
	var err error
	// temporal, err = client.NewClient(client.Options{})
	if err != nil {
		log.Fatalln("unable to create Temporal client", err)
	}

	r := mux.NewRouter()
	r.Handle("/ping", http.HandlerFunc(PingHandler)).Methods("GET")
	r.Handle("/control", http.HandlerFunc(TogglePlayHandler)).Methods("GET")

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

func PingHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Pong")
}

func NotFoundHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)
	res := ErrorResponse{Message: "Endpoint not found"}
	json.NewEncoder(w).Encode(res)
}

func TogglePlayHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Control called")
	c, err := client.NewClient(client.Options{})
	if err != nil {
		log.Fatalln("unable to create Temporal client", err)
	}
	defer c.Close()
	options := client.StartWorkflowOptions{
		ID:        "control-workflow",
		TaskQueue: app.ControlTaskQueue,
	}
	name := "World"
	we, err := c.ExecuteWorkflow(context.Background(), options, app.ControlWorkflow, name)
	if err != nil {
		log.Fatalln("unable to complete Workflow", err)
	}
	var res string
	err = we.Get(context.Background(), &res)
	fmt.Println("Control called4" + res)
	if err != nil {
		log.Fatalln("unable to get Workflow result", err)
	}
	printResults(res, we.GetID(), we.GetRunID())
}

/*
	vars := mux.Vars(r)
	var item app.CartItem
	err := json.NewDecoder(r.Body).Decode(&item)
	if err != nil {
		WriteError(w, err)
		return
	}

	update := app.RemoveFromCartSignal{Route: app.RouteTypes.REMOVE_FROM_CART, Item: item}

	err = temporal.SignalWorkflow(context.Background(), vars["workflowID"], vars["runID"], app.SignalChannelName, update)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
*/
