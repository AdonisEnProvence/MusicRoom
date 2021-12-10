package mtv

import (
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	activities_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/activities"
	shared_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/shared"
	"go.temporal.io/sdk/workflow"
)

func sendAcknowledgeRoomCreation(ctx workflow.Context, state shared_mtv.MtvRoomExposedState) error {
	ao := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var a *activities_mtv.Activities
	if err := workflow.ExecuteActivity(
		ctx,
		a.CreationAcknowledgementActivity,
		state,
	).Get(ctx, nil); err != nil {
		return err
	}

	return nil
}

func sendAcknowledgeTracksSuggestionFailActivity(ctx workflow.Context, args activities_mtv.AcknowledgeTracksSuggestionFailArgs) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.AcknowledgeTracksSuggestionFail,
		args,
	)
}

func sendAcknowledgeTracksSuggestionActivity(ctx workflow.Context, args activities_mtv.AcknowledgeTracksSuggestionArgs) {

	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.AcknowledgeTracksSuggestion,
		args,
	)
}

func sendAcknowledgeUpdateUserFitsPositionConstraintActivity(ctx workflow.Context, state shared_mtv.MtvRoomExposedState) {

	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.AcknowledgeUpdateUserFitsPositionConstraint,
		state,
	)
}

func sendAcknowledgeUpdateDelegationOwnerActivity(ctx workflow.Context, state shared_mtv.MtvRoomExposedState) {

	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.AcknowledgeUpdateDelegationOwner,
		state,
	)
}

func sendAcknowledgeUpdateControlAndDelegationPermissionActivity(ctx workflow.Context, state shared_mtv.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.AcknowledgeUpdateControlAndDelegationPermission,
		state,
	)
}

func sendUserLengthUpdateActivity(ctx workflow.Context, state shared_mtv.MtvRoomExposedState) {

	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.UserLengthUpdateActivity,
		state,
	)
}

func sendLeaveActivity(ctx workflow.Context, args activities_mtv.AcknowledgeLeaveRoomRequestBody) {

	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.LeaveActivity,
		args,
	)
}

func sendNotifySuggestOrVoteUpdateActivity(ctx workflow.Context, state shared_mtv.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.NotifySuggestOrVoteUpdateActivity,
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

func sendUserVoteForTrackAcknowledgementActivity(ctx workflow.Context, state shared_mtv.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.UserVoteForTrackAcknowledgement,
		state,
	)
}

func sendJoinActivity(ctx workflow.Context, args activities_mtv.MtvJoinCallbackRequestBody) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.JoinActivity,
		args,
	)
}

func sendChangeUserEmittingDeviceActivity(ctx workflow.Context, state shared_mtv.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.ChangeUserEmittingDeviceActivity,
		state,
	)
}

func sendPauseActivity(ctx workflow.Context, state shared_mtv.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.PauseActivity,
		state,
	)
}

func sendPlayActivity(ctx workflow.Context, state shared_mtv.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.PlayActivity,
		state,
	)
}

func sendAcknowledgeUpdateTimeConstraintActivity(ctx workflow.Context, state shared_mtv.MtvRoomExposedState) {
	options := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities_mtv.Activities
	workflow.ExecuteActivity(
		ctx,
		a.AcknowledgeUpdateTimeConstraint,
		state,
	)
}
