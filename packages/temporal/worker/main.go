package main

import (
	"log"

	activities_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/activities"
	activities_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/activities"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	mpe "github.com/AdonisEnProvence/MusicRoom/mpe/workflows"
	shared_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/shared"
	mtv "github.com/AdonisEnProvence/MusicRoom/mtv/workflows"
)

func main() {
	// Create the client object just once per process
	c, err := client.NewClient(client.Options{})
	if err != nil {
		log.Fatalln("unable to create Temporal client", err)
	}
	defer c.Close()
	// This worker hosts both Worker and Activity functions
	w := worker.New(c, shared_mtv.ControlTaskQueue, worker.Options{})

	// Common activities
	w.RegisterActivity(activities.FetchTracksInformationActivity)
	w.RegisterActivity(activities.FetchTracksInformationActivityAndForwardInitiator)

	// Mtv workflows
	w.RegisterWorkflow(mtv.MtvRoomWorkflow)

	// Mtv activities
	var mtvActivities *activities_mtv.Activities
	w.RegisterActivity(mtvActivities)

	// Mpe workflow
	w.RegisterWorkflow(mpe.MpeRoomWorkflow)

	// Mpe activities
	var mpeActivities *activities_mpe.Activities
	w.RegisterActivity(mpeActivities)

	// Start listening to the Task Queue
	err = w.Run(worker.InterruptCh())
	if err != nil {
		log.Fatalln("unable to start Worker", err)
	}
}
