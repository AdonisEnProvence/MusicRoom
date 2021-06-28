package workflows

import (
	"fmt"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/Devessier/brainy"

	"github.com/mitchellh/mapstructure"
	"go.temporal.io/sdk/workflow"
)

type MtvRoomMachineContext struct {
	Timer       shared.MtvRoomTimer
	CancelTimer func()
}

const (
	MtvRoomPausedState                 brainy.StateType = "paused"
	MtvRoomPausedStoppingState         brainy.StateType = "stopping"
	MtvRoomPausedStoppedState          brainy.StateType = "stopped"
	MtvRoomPlayingState                brainy.StateType = "playing"
	MtvRoomPlayingLaunchingTimerState  brainy.StateType = "launching-timer"
	MtvRoomPlayingWaitingTimerEndState brainy.StateType = "waiting-timer-end"
	MtvRoomPlayingTimeoutExpiredState  brainy.StateType = "timeout-expired"

	MtvRoomPlayEvent          brainy.EventType = "PLAY"
	MtvRoomPauseEvent         brainy.EventType = "PAUSE"
	MtvRoomTimerLaunchedEvent brainy.EventType = "TIMER_LAUNCHED"
	MtvRoomTimerExpiredEvent  brainy.EventType = "TIMER_EXPIRED"
	MtvRoomGoToPausedEvent    brainy.EventType = "GO_TO_PAUSED"
)

type MtvRoomTimerExpirationEvent struct {
	brainy.EventWithType

	Timer shared.MtvRoomTimer
}

func NewMtvRoomTimerExpirationEvent(t shared.MtvRoomTimer) MtvRoomTimerExpirationEvent {
	return MtvRoomTimerExpirationEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomTimerExpiredEvent,
		},
		Timer: t,
	}
}

func MtvRoomWorkflow(ctx workflow.Context, state shared.MtvRoomState) error {
	var (
		err          error
		trackMachine *brainy.Machine
	)

	logger := workflow.GetLogger(ctx)

	if err := workflow.SetQueryHandler(
		ctx,
		shared.MtvGetStateQuery,
		func(input []byte) (shared.MtvRoomState, error) {
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

	trackMachine, err = brainy.NewMachine(brainy.StateNode{
		Context: &MtvRoomMachineContext{
			Timer: shared.MtvRoomTimer{
				State:         shared.MtvRoomTimerStateIdle,
				Elapsed:       0,
				TotalDuration: state.CurrentTrack.Duration,
			},
		},

		Initial: MtvRoomPausedState,

		States: brainy.StateNodes{
			MtvRoomPausedState: &brainy.StateNode{
				OnEntry: brainy.Actions{
					func(c brainy.Context, e brainy.Event) error {
						options := workflow.ActivityOptions{
							ScheduleToStartTimeout: time.Minute,
							StartToCloseTimeout:    time.Minute,
						}
						ctx = workflow.WithActivityOptions(ctx, options)

						err := workflow.ExecuteActivity(
							ctx,
							activities.PauseActivity,
							state.RoomID,
						).Get(ctx, nil)

						return err
					},
				},

				On: brainy.Events{
					MtvRoomPlayEvent: brainy.Transition{
						Target: MtvRoomPlayingState,

						Actions: brainy.Actions{
							func(c brainy.Context, e brainy.Event) error {
								options := workflow.ActivityOptions{
									ScheduleToStartTimeout: time.Minute,
									StartToCloseTimeout:    time.Minute,
								}
								ctx = workflow.WithActivityOptions(ctx, options)

								err := workflow.ExecuteActivity(
									ctx,
									activities.PlayActivity,
									state.RoomID,
								).Get(ctx, nil)

								return err
							},
						},
					},
				},
			},

			MtvRoomPlayingState: &brainy.StateNode{
				Initial: MtvRoomPlayingLaunchingTimerState,

				States: brainy.StateNodes{
					MtvRoomPlayingLaunchingTimerState: &brainy.StateNode{
						OnEntry: brainy.Actions{
							func(c brainy.Context, e brainy.Event) error {
								timerContext := c.(*MtvRoomMachineContext)

								ctx, cancel := workflow.WithCancel(ctx)
								timerContext.CancelTimer = cancel

								workflow.Go(ctx, func(ctx workflow.Context) {
									ao := workflow.ActivityOptions{
										ScheduleToStartTimeout: 5 * time.Second,
										StartToCloseTimeout:    state.CurrentTrack.Duration * 2,
									}
									ctx = workflow.WithActivityOptions(ctx, ao)

									var timerActivityResult shared.MtvRoomTimer

									trackMachine.Send(MtvRoomTimerLaunchedEvent)

									if err := workflow.ExecuteActivity(
										ctx,
										activities.TrackTimerActivity,
										*timerContext,
									).Get(ctx, &timerActivityResult); err != nil {
										logger.Error("error occured in timer activity", err)

										return
									}

									trackMachine.Send(
										NewMtvRoomTimerExpirationEvent(timerActivityResult),
									)
								})

								return nil
							},
						},

						On: brainy.Events{
							MtvRoomTimerLaunchedEvent: MtvRoomPlayingWaitingTimerEndState,
						},
					},

					MtvRoomPlayingWaitingTimerEndState: &brainy.StateNode{
						On: brainy.Events{
							MtvRoomTimerExpiredEvent: brainy.Transition{
								Target: MtvRoomPlayingTimeoutExpiredState,

								Actions: brainy.Actions{
									func(c brainy.Context, e brainy.Event) error {
										ctx := c.(*MtvRoomMachineContext)
										event := e.(MtvRoomTimerExpirationEvent)

										ctx.Timer = event.Timer

										return nil
									},
								},
							},

							MtvRoomPauseEvent: brainy.Transition{
								Actions: brainy.Actions{
									func(c brainy.Context, e brainy.Event) error {
										ctx := c.(*MtvRoomMachineContext)

										if cancel := ctx.CancelTimer; cancel != nil {
											cancel()
										}

										return nil
									},
								},
							},
						},
					},

					MtvRoomPlayingTimeoutExpiredState: &brainy.StateNode{
						OnEntry: brainy.Actions{
							func(c brainy.Context, e brainy.Event) error {
								// Go to Paused state
								// As Brainy does not have final nor internal events,
								// we should spawn a goroutine and emit an event from it.
								workflow.Go(ctx, func(ctx workflow.Context) {
									trackMachine.Send(MtvRoomGoToPausedEvent)
								})

								return nil
							},
						},
					},
				},

				On: brainy.Events{
					MtvRoomGoToPausedEvent: MtvRoomPausedState,
				},
			},
		},
	})
	if err != nil {
		fmt.Printf("machine error : %v\n", err)
		return err
	}

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

				trackMachine.Send(MtvRoomPlayEvent)

			case shared.SignalRoutePause:
				var message shared.PauseSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

				trackMachine.Send(MtvRoomPauseEvent)

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

func acknowledgeRoomCreation(ctx workflow.Context, state shared.MtvRoomState) error {
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
