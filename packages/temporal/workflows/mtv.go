package workflows

import (
	"errors"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	"github.com/AdonisEnProvence/MusicRoom/shared"

	"github.com/mitchellh/mapstructure"
	"go.temporal.io/sdk/workflow"
)

func MtvRoomWorkflow(ctx workflow.Context, state shared.ControlState) error {
	var err error

	logger := workflow.GetLogger(ctx)

	if err := workflow.SetQueryHandler(
		ctx,
		shared.MtvGetStateQuery,
		func(input []byte) (shared.ControlState, error) {
			return state, nil
		},
	); err != nil {
		logger.Info("SetQueryHandler failed.", "Error", err)
		return err
	}

	channel := workflow.GetSignalChannel(ctx, shared.SignalChannelName)
	terminated := false

	state.Tracks, err = getInitialTracksInformation(ctx, state.TracksIDsList)
	if err != nil {
		return err
	}

	if err := acknowledgeRoomCreation(ctx, state); err != nil {
		return err
	}

	if len(state.Tracks) > 0 {
		currentTrack := state.Tracks[0]
		state.CurrentTrack = currentTrack
		state.Tracks = state.Tracks[1:]
		state.TracksIDsList = state.TracksIDsList[1:]
	}

	endOfTrackTimerCtx, cancelEndOfTrackTimer := workflow.WithCancel(ctx)
	endOfTrackTimer := workflow.NewTimer(endOfTrackTimerCtx, state.CurrentTrack.Duration)

	for {
		selector := workflow.NewSelector(ctx)

		selector.AddReceive(channel, func(c workflow.ReceiveChannel, _ bool) {
			var signal interface{}
			c.Receive(ctx, &signal)

			var routeSignal shared.GenericRouteSignal

			if err := mapstructure.Decode(signal, &routeSignal); err != nil {
				logger.Error("Invalid signal type %v", err)
				return
			}

			switch routeSignal.Route {
			case shared.SignalRoutePlay:
				var message shared.PlaySignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

				state.Play()

				options := workflow.ActivityOptions{
					ScheduleToStartTimeout: time.Minute,
					StartToCloseTimeout:    time.Minute,
				}
				ctx = workflow.WithActivityOptions(ctx, options)
				if err := workflow.ExecuteActivity(
					ctx,
					activities.PlayActivity,
					state.RoomID,
				).Get(ctx, nil); err != nil {
					return
				}

			case shared.SignalRoutePause:
				var message shared.PauseSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

				state.Pause()

				cancelEndOfTrackTimer()

				options := workflow.ActivityOptions{
					ScheduleToStartTimeout: time.Minute,
					StartToCloseTimeout:    time.Minute,
				}
				ctx = workflow.WithActivityOptions(ctx, options)
				if err := workflow.ExecuteActivity(
					ctx,
					activities.PauseActivity,
					state.RoomID,
				).Get(ctx, nil); err != nil {
					return
				}

			case shared.SignalRouteJoin:
				var message shared.JoinSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

				state.Join(message.UserID)

				options := workflow.ActivityOptions{
					ScheduleToStartTimeout: time.Minute,
					StartToCloseTimeout:    time.Minute,
				}
				ctx = workflow.WithActivityOptions(ctx, options)
				if err := workflow.ExecuteActivity(
					ctx,
					activities.JoinActivity,
					state,
				).Get(ctx, nil); err != nil {
					return
				}
			case shared.SignalRouteTerminate:
				terminated = true
			}
		})

		if state.Playing {
			selector.AddFuture(endOfTrackTimer, func(f workflow.Future) {
				if err := f.Get(ctx, nil); errors.Is(err, workflow.ErrCanceled) {
					return
				}

				// There are no more tracks to play, wait for tracks to be added.
				if noMoreTrack := len(state.Tracks) == 0; noMoreTrack {
					state.Playing = false
					cancelEndOfTrackTimer()
					return
				}

				state.CurrentTrack = state.Tracks[0]
				state.Tracks = state.Tracks[1:]
				state.TracksIDsList = state.TracksIDsList[1:]

				endOfTrackTimerCtx, cancelEndOfTrackTimer = workflow.WithCancel(ctx)
				endOfTrackTimer = workflow.NewTimer(endOfTrackTimerCtx, state.CurrentTrack.Duration)
			})
		}

		selector.Select(ctx)

		if terminated {
			break
		}
	}

	return nil
}

func getInitialTracksInformation(ctx workflow.Context, initialTracksIDs []string) ([]shared.TrackMetadata, error) {
	ao := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var initialTracksMetadata []shared.TrackMetadata

	if err := workflow.ExecuteActivity(
		ctx,
		activities.FetchTracksInformationActivity,
		initialTracksIDs,
	).Get(ctx, &initialTracksMetadata); err != nil {
		return nil, err
	}

	return initialTracksMetadata, nil
}

func acknowledgeRoomCreation(ctx workflow.Context, state shared.ControlState) error {
	ao := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	if err := workflow.ExecuteActivity(
		ctx,
		activities.CreationAcknowledgementActivity,
		state,
	).Get(ctx, nil); err != nil {
		return err
	}

	return nil
}
