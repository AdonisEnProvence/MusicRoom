package main

import (
	"log"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/AdonisEnProvence/MusicRoom/workflows"
)

func main() {
	// Create the client object just once per process
	c, err := client.NewClient(client.Options{})
	if err != nil {
		log.Fatalln("unable to create Temporal client", err)
	}
	defer c.Close()
	// This worker hosts both Worker and Activity functions
	w := worker.New(c, shared.ControlTaskQueue, worker.Options{})

	w.RegisterWorkflow(workflows.MtvRoomWorkflow)

	w.RegisterActivity(activities.PingActivity)
	w.RegisterActivity(activities.PlayActivity)
	w.RegisterActivity(activities.PauseActivity)
	w.RegisterActivity(activities.JoinActivity)
	w.RegisterActivity(activities.CreationAcknowledgementActivity)
	w.RegisterActivity(activities.FetchTracksInformationActivity)
	w.RegisterActivity(activities.FetchTracksInformationActivityAndForwardIniator)
	w.RegisterActivity(activities.UserLengthUpdateActivity)
	w.RegisterActivity(activities.ChangeUserEmittingDeviceActivity)
	w.RegisterActivity(activities.SuggestedTracksListChangedActivity)

	// Start listening to the Task Queue
	err = w.Run(worker.InterruptCh())
	if err != nil {
		log.Fatalln("unable to start Worker", err)
	}
}
