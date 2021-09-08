package workflows

import (
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	"go.temporal.io/sdk/workflow"
)

func sendAcknowledgeTracksSuggestionFailActivity(ctx workflow.Context, args activities.AcknowledgeTracksSuggestionFailArgs) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.AcknowledgeTracksSuggestionFail,
		args,
	)
}

func sendAcknowledgeTracksSuggestionActivity(ctx workflow.Context, args activities.AcknowledgeTracksSuggestionArgs) {

	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.AcknowledgeTracksSuggestion,
		args,
	)
}
