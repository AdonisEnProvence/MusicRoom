package app

import (
	"fmt"
	"time"

	"github.com/mitchellh/mapstructure"
	"go.temporal.io/sdk/workflow"
)

type (
	ControlState struct {
		Playing       bool     `json:"playing"`
		Name          string   `json:"name"`
		Users         []string `json:"users"`
		TracksIDsList []string `json:"tracksIDsList"`
	}
)

func ControlWorkflow(ctx workflow.Context, state ControlState) error {
	// https://docs.temporal.io/docs/concepts/workflows/#workflows-have-options
	logger := workflow.GetLogger(ctx)

	err := workflow.SetQueryHandler(ctx, "getState", func(input []byte) (ControlState, error) {
		return state, nil
	})
	if err != nil {
		logger.Info("SetQueryHandler failed.", "Error", err)
		return err
	}

	channel := workflow.GetSignalChannel(ctx, SignalChannelName)
	terminated := false
	// sentAbandonedCartEmail := false

	for {
		selector := workflow.NewSelector(ctx)
		selector.AddReceive(channel, func(c workflow.ReceiveChannel, _ bool) {
			var signal interface{}
			c.Receive(ctx, &signal)

			var routeSignal RouteSignal
			err := mapstructure.Decode(signal, &routeSignal)
			if err != nil {
				logger.Error("Invalid signal type %v", err)
				return
			}

			switch {
			case routeSignal.Route == RouteTypes.PLAY:
				var message PlaySignal
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

				err = workflow.ExecuteActivity(ctx, PlayActivity, message.WorkflowID).Get(ctx, nil)
				if err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
			case routeSignal.Route == RouteTypes.PAUSE:
				var message PauseSignal
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

				err = workflow.ExecuteActivity(ctx, PauseActivity, message.WorkflowID).Get(ctx, nil)
				if err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
			case routeSignal.Route == RouteTypes.JOIN:
				var message JoinSignal
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
				err = workflow.ExecuteActivity(ctx, JoinActivity, message.WorkflowID, message.UserID, state).Get(ctx, nil)
				if err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
			case routeSignal.Route == RouteTypes.TERMINATE:
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

func (state *ControlState) Pause() {
	if state.Playing {
		state.Playing = false
		fmt.Println("PAUSED")
	} else {
		fmt.Println("PAUSED FAILED")
	}
}

func (state *ControlState) Play() {
	if !state.Playing {
		state.Playing = true
		fmt.Println("PLAYED")
	} else {
		fmt.Println("PLAYED FAILED")
	}
}

func (state *ControlState) Join(userID string) {
	state.Users = append(state.Users, userID)
}
