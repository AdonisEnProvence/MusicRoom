package app

import (
	"fmt"

	"github.com/mitchellh/mapstructure"
	"go.temporal.io/sdk/workflow"
)

type (
	ControlState struct {
		Playing bool
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
	checkedOut := false
	// sentAbandonedCartEmail := false

	// var a *Activities

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
				state.Play()
			case routeSignal.Route == RouteTypes.PAUSE:
				state.Pause()
			}
		})

		// if !sentAbandonedCartEmail && len(state.Items) > 0 {
		// 	selector.AddFuture(workflow.NewTimer(ctx, abandonedCartTimeout), func(f workflow.Future) {
		// 		sentAbandonedCartEmail = true
		// 		ao := workflow.ActivityOptions{
		// 			ScheduleToStartTimeout: time.Minute,
		// 			StartToCloseTimeout:    time.Minute,
		// 		}

		// 		ctx = workflow.WithActivityOptions(ctx, ao)

		// 		err := workflow.ExecuteActivity(ctx, a.SendAbandonedCartEmail, state.Email).Get(ctx, nil)
		// 		if err != nil {
		// 			logger.Error("Error sending email %v", err)
		// 			return
		// 		}
		// 	})
		// }

		selector.Select(ctx)

		if checkedOut {
			break
		}
	}

	return nil
}

// @@@SNIPSTART temporal-ecommerce-add-and-remove

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

// @@@SNIPEND
