package workflows

import (
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	"github.com/AdonisEnProvence/MusicRoom/shared"
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

func sendAcknowledgeUpdateUserFitsPositionConstraintActivity(ctx workflow.Context, state shared.MtvRoomExposedState) {

	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.AcknowledgeUpdateUserFitsPositionConstraint,
		state,
	)
}

func sendAcknowledgeUpdateDelegationOwnerActivity(ctx workflow.Context, state shared.MtvRoomExposedState) {

	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.AcknowledgeUpdateDelegationOwner,
		state,
	)
}

func sendAcknowledgeUpdateControlAndDelegationPermissionActivity(ctx workflow.Context, state shared.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.AcknowledgeUpdateControlAndDelegationPermission,
		state,
	)
}

func sendUserLengthUpdateActivity(ctx workflow.Context, state shared.MtvRoomExposedState) {

	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.UserLengthUpdateActivity,
		state,
	)
}

func sendLeaveActivity(ctx workflow.Context, args activities.AcknowledgeLeaveRoomRequestBody) {

	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.LeaveActivity,
		args,
	)
}

func sendNotifySuggestOrVoteUpdateActivity(ctx workflow.Context, state shared.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.NotifySuggestOrVoteUpdateActivity,
		state,
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

func sendUserVoteForTrackAcknowledgementActivity(ctx workflow.Context, state shared.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.UserVoteForTrackAcknowledgement,
		state,
	)
}

func sendJoinActivity(ctx workflow.Context, args activities.MtvJoinCallbackRequestBody) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.JoinActivity,
		args,
	)
}

func sendChangeUserEmittingDeviceActivity(ctx workflow.Context, state shared.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.ChangeUserEmittingDeviceActivity,
		state,
	)
}

func sendPauseActivity(ctx workflow.Context, state shared.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.PauseActivity,
		state,
	)
}

func sendPlayActivity(ctx workflow.Context, state shared.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(
		ctx,
		activities.PlayActivity,
		state,
	)
}
