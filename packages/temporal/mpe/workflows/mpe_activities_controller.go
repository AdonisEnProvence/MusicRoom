package mpe

import (
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	activities_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/activities"
	"go.temporal.io/sdk/workflow"
)

func sendFetchTracksInformationActivity(ctx workflow.Context, tracksIDs []string) workflow.Future {

	ao := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	return workflow.ExecuteActivity(
		ctx,
		activities.FetchTracksInformationActivity,
		tracksIDs,
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

func sendRejectAddingTracksActivity(ctx workflow.Context, args activities_mpe.RejectAddingTracksActivityArgs) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mpe.Activities
	workflow.ExecuteActivity(
		ctx,
		a.RejectAddingTracksActivity,
		args,
	)
}

func sendAcknowledgeAddingTracksActivity(ctx workflow.Context, args activities_mpe.AcknowledgeAddingTracksActivityArgs) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mpe.Activities
	workflow.ExecuteActivity(
		ctx,
		a.AcknowledgeAddingTracksActivity,
		args,
	)
}

func sendRejectChangeTrackOrderActivity(ctx workflow.Context, args activities_mpe.RejectChangeTrackOrderActivityArgs) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities_mpe.RejectChangeTrackOrderActivity,
		args,
	)
}

func sendAcknowledgeChangeTrackOrderActivity(ctx workflow.Context, args activities_mpe.AcknowledgeChangeTrackOrderActivityArgs) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities_mpe.AcknowledgeChangeTrackOrderActivity,
		args,
	)
}
