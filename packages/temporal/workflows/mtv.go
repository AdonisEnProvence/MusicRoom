package workflows

import (
	"fmt"
	"time"

	"adonis-en-provence/music_room/activities"
	"adonis-en-provence/music_room/shared"

	"github.com/mitchellh/mapstructure"
	"go.temporal.io/sdk/workflow"
)

func MtvRoomWorkflow(ctx workflow.Context, state shared.ControlState) error {
	logger := workflow.GetLogger(ctx)

	err := workflow.SetQueryHandler(ctx, "getState", func(input []byte) (shared.ControlState, error) {
		return state, nil
	})
	if err != nil {
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

	for {
		selector := workflow.NewSelector(ctx)

		selector.AddReceive(channel, func(c workflow.ReceiveChannel, _ bool) {
			var signal interface{}
			c.Receive(ctx, &signal)

			var routeSignal shared.GenericRouteSignal

			err := mapstructure.Decode(signal, &routeSignal)
			if err != nil {
				logger.Error("Invalid signal type %v", err)
				return
			}

			switch routeSignal.Route {
			case shared.SignalRoutePlay:
				var message shared.PlaySignal

				err := mapstructure.Decode(signal, &message)
				if err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

				state.Play()
				options := workflow.ActivityOptions{
					ScheduleToStartTimeout: time.Minute,
					StartToCloseTimeout:    time.Minute,
				}

				ctx = workflow.WithActivityOptions(ctx, options)

				err = workflow.ExecuteActivity(ctx, activities.PlayActivity, message.WorkflowID).Get(ctx, nil)
				if err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

			case shared.SignalRoutePause:
				var message shared.PauseSignal

				err := mapstructure.Decode(signal, &message)
				if err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

				state.Pause()
				options := workflow.ActivityOptions{
					ScheduleToStartTimeout: time.Minute,
					StartToCloseTimeout:    time.Minute,
				}

				ctx = workflow.WithActivityOptions(ctx, options)

				err = workflow.ExecuteActivity(ctx, activities.PauseActivity, message.WorkflowID).Get(ctx, nil)
				if err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

			case shared.SignalRouteJoin:
				var message shared.JoinSignal

				err := mapstructure.Decode(signal, &message)
				if err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

				state.Join(message.UserID)
				options := workflow.ActivityOptions{
					ScheduleToStartTimeout: time.Minute,
					StartToCloseTimeout:    time.Minute,
				}

				ctx = workflow.WithActivityOptions(ctx, options)
				fmt.Println(state)
				err = workflow.ExecuteActivity(ctx, activities.JoinActivity, message.WorkflowID, message.UserID, state).Get(ctx, nil)
				if err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
			case shared.SignalRouteTerminate:
				fmt.Println("Terminating workflow")
				terminated = true
			}
		})

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
		activities.FetchTracksInformation,
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

	var result string
	activityArgs := activities.CreationAcknowledgementActivityArgs{
		RoomID: "8af81cc4-aa0c-4791-ac91-4f6a71379137", // TODO: replace with real value
		UserID: "8af81cc4-aa0c-4791-ac91-4f6a71379137", // TODO: replace with real value
		State:  state,
	}

	err := workflow.ExecuteActivity(ctx, activities.CreationAcknowledgementActivity, activityArgs).Get(ctx, &result)
	if err != nil {
		return err
	}

	return nil
}
