package mpe

import (
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	"go.temporal.io/sdk/workflow"
)

func sendFetchTracksInformationActivity(ctx workflow.Context, trackID string) workflow.Future {

	ao := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	return workflow.ExecuteActivity(
		ctx,
		activities.FetchTracksInformationActivity,
		[]string{
			trackID,
		},
	)
}

func sendFetchTracksInformationActivityAndForwardInitiator(ctx workflow.Context, tracksIDs []string, userID string, deviceID string) workflow.Future {
	ao := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	return workflow.ExecuteActivity(
		ctx,
		activities.FetchTracksInformationActivityAndForwardInitiator,
		tracksIDs,
		userID,
		deviceID,
	)
}

