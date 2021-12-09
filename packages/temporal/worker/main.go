package main

import (
	"log"

	activities_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/activities"

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

	w.RegisterWorkflow(mtv.MtvRoomWorkflow)

	w.RegisterActivity(activities.PingActivity)
	w.RegisterActivity(activities.PlayActivity)
	w.RegisterActivity(activities.PauseActivity)
	w.RegisterActivity(activities.JoinActivity)
	w.RegisterActivity(activities.CreationAcknowledgementActivity)
	w.RegisterActivity(activities.FetchTracksInformationActivity)
	w.RegisterActivity(activities.FetchTracksInformationActivityAndForwardInitiator)
	w.RegisterActivity(activities.UserLengthUpdateActivity)
	w.RegisterActivity(activities.ChangeUserEmittingDeviceActivity)
	w.RegisterActivity(activities.NotifySuggestOrVoteUpdateActivity)
	w.RegisterActivity(activities.UserVoteForTrackAcknowledgement)
	w.RegisterActivity(activities.AcknowledgeTracksSuggestion)
	w.RegisterActivity(activities.AcknowledgeTracksSuggestionFail)
	w.RegisterActivity(activities.AcknowledgeUpdateUserFitsPositionConstraint)
	w.RegisterActivity(activities.AcknowledgeUpdateDelegationOwner)
	w.RegisterActivity(activities.AcknowledgeUpdateControlAndDelegationPermission)
	w.RegisterActivity(activities.AcknowledgeUpdateTimeConstraint)
	w.RegisterActivity(activities.LeaveActivity)

	w.RegisterWorkflow(mpe.MpeRoomWorkflow)

	w.RegisterActivity(activities_mpe.MpeCreationAcknowledgementActivity)

	// Start listening to the Task Queue
	err = w.Run(worker.InterruptCh())
	if err != nil {
		log.Fatalln("unable to start Worker", err)
	}
}
