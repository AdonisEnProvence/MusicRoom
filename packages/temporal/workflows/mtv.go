package workflows

import (
	"fmt"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/Devessier/brainy"

	"github.com/mitchellh/mapstructure"
	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

type MtvRoomInternalState struct {
	initialParams shared.MtvRoomParameters

	Machine       *brainy.Machine
	Users         []string
	TracksIDsList []string
	CurrentTrack  shared.CurrentTrack
	Tracks        []shared.TrackMetadata
}

func (s *MtvRoomInternalState) FillWith(params shared.MtvRoomParameters) {
	s.initialParams = params

	s.Users = params.InitialUsers
	s.TracksIDsList = params.InitialTracksIDsList
}

func (s *MtvRoomInternalState) Export() shared.MtvRoomExposedState {
	isPlaying := false
	if machine := s.Machine; machine != nil {
		isPlaying = machine.UnsafeCurrent().Matches(MtvRoomPlayingState)
	}

	exposedTracks := make([]shared.ExposedTrackMetadata, 0, len(s.Tracks))
	for _, v := range s.Tracks {
		exposedTracks = append(exposedTracks, v.Export())
	}

	var currentTrackToExport *shared.ExposedCurrentTrack = nil
	if s.CurrentTrack.ID != "" {
		tmp := s.CurrentTrack.Export()
		currentTrackToExport = &tmp
	}

	exposedState := shared.MtvRoomExposedState{
		RoomID:            s.initialParams.RoomID,
		RoomCreatorUserID: s.initialParams.RoomCreatorUserID,
		Playing:           isPlaying,
		RoomName:          s.initialParams.RoomName,
		Users:             s.Users,
		TracksIDsList:     s.TracksIDsList,
		CurrentTrack:      currentTrackToExport,
		Tracks:            exposedTracks,
	}

	return exposedState
}

func (s *MtvRoomInternalState) AddUser(userID string) {
	s.Users = append(s.Users, userID)
}

type MtvRoomMachineContext struct {
	Timer       shared.MtvRoomTimer
	CancelTimer func()
	CreatedAt   time.Time
}

const (
	MtvRoomInit                        brainy.StateType = "init"
	MtvRoomFetchInitialTracks          brainy.StateType = "fetching-initial-tracks"
	MtvRoomPausedState                 brainy.StateType = "paused"
	MtvRoomPausedStoppingState         brainy.StateType = "stopping"
	MtvRoomPausedStoppedState          brainy.StateType = "stopped"
	MtvRoomPlayingState                brainy.StateType = "playing"
	MtvRoomPlayingLauchingTimerState   brainy.StateType = "launching-timer"
	MtvRoomPlayingWaitingTimerEndState brainy.StateType = "waiting-timer-end"
	MtvRoomPlayingTimeoutExpiredState  brainy.StateType = "timeout-expired"

	MtvRoomPlayEvent            brainy.EventType = "PLAY"
	MtvRoomPauseEvent           brainy.EventType = "PAUSE"
	MtvRoomTimerLaunchedEvent   brainy.EventType = "TIMER_LAUNCHED"
	MtvRoomTimerExpiredEvent    brainy.EventType = "TIMER_EXPIRED"
	MtvRoomInitialTracksFetched brainy.EventType = "INITIAL_TRACKS_FETCHED"
	MtvRoomIsReady              brainy.EventType = "MTV_ROOM_IS_READY"
	MtvRoomGoToPausedEvent      brainy.EventType = "GO_TO_PAUSED"
	MtvRoomAddUserEvent         brainy.EventType = "ADD_USER"
	MtvRoomGoToNextTrackEvent   brainy.EventType = "GO_TO_NEXT_TRACK"
)

type MtvRoomTimerExpirationEvent struct {
	brainy.EventWithType

	Timer shared.MtvRoomTimer
}

type MtvRoomInitialTracksFetchedEvent struct {
	brainy.EventWithType

	Tracks []shared.TrackMetadata
}

func NewMtvRoomTimerExpirationEvent(t shared.MtvRoomTimer) MtvRoomTimerExpirationEvent {
	fmt.Printf("MAMAN \n%+v\n", t)

	return MtvRoomTimerExpirationEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomTimerExpiredEvent,
		},
		Timer: t,
	}
}

func NewMtvRoomInitialTracksFetchedEvent(tracks []shared.TrackMetadata) MtvRoomInitialTracksFetchedEvent {
	return MtvRoomInitialTracksFetchedEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomInitialTracksFetched,
		},
		Tracks: tracks,
	}
}

type MtvRoomUserJoiningRoomEvent struct {
	brainy.EventWithType

	UserID string
}

func NewMtvRoomUserJoiningRoomEvent(userID string) MtvRoomUserJoiningRoomEvent {
	return MtvRoomUserJoiningRoomEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomAddUserEvent,
		},

		UserID: userID,
	}
}

func MtvRoomWorkflow(ctx workflow.Context, params shared.MtvRoomParameters) error {
	var (
		err           error
		internalState MtvRoomInternalState
	)

	internalState.FillWith(params)

	logger := workflow.GetLogger(ctx)

	if err := workflow.SetQueryHandler(
		ctx,
		shared.MtvGetStateQuery,
		func(input []byte) (shared.MtvRoomExposedState, error) {
			exposedState := internalState.Export()

			return exposedState, nil
		},
	); err != nil {
		logger.Info("SetQueryHandler failed.", "Error", err)
		return err
	}

	channel := workflow.GetSignalChannel(ctx, shared.SignalChannelName)

	var (
		terminated                 = false
		workflowFatalError         error
		timerExpirationFuture      workflow.Future
		fetchedInitialTracksFuture workflow.Future
	)

	myContext := &MtvRoomMachineContext{
		Timer: shared.MtvRoomTimer{
			State:         shared.MtvRoomTimerStateIdle,
			Elapsed:       0,
			TotalDuration: internalState.CurrentTrack.Duration,
		},
	}

	internalState.Machine, err = brainy.NewMachine(brainy.StateNode{
		Context: myContext,

		Initial: MtvRoomFetchInitialTracks,

		States: brainy.StateNodes{
			MtvRoomFetchInitialTracks: &brainy.StateNode{
				OnEntry: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {

							ao := workflow.ActivityOptions{
								ScheduleToStartTimeout: time.Minute,
								StartToCloseTimeout:    time.Minute,
							}
							ctx = workflow.WithActivityOptions(ctx, ao)

							fetchedInitialTracksFuture = workflow.ExecuteActivity(
								ctx,
								activities.FetchTracksInformationActivity,
								internalState.TracksIDsList,
							)

							return nil
						},
					),
				},

				On: brainy.Events{
					MtvRoomInitialTracksFetched: brainy.Transition{
						Target: MtvRoomPausedState,

						Actions: brainy.Actions{
							brainy.ActionFn(
								assignFetchedTracks(&internalState),
							),
							brainy.ActionFn(
								func(brainy.Context, brainy.Event) error {
									if err := acknowledgeRoomCreation(ctx, internalState.Export()); err != nil {
										workflowFatalError = err
									}

									return nil
								},
							),
						},
					},
				},
			},

			MtvRoomPausedState: &brainy.StateNode{
				OnEntry: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							options := workflow.ActivityOptions{
								ScheduleToStartTimeout: time.Minute,
								StartToCloseTimeout:    time.Minute,
							}
							ctx = workflow.WithActivityOptions(ctx, options)

							workflow.ExecuteActivity(
								ctx,
								activities.PauseActivity,
								params.RoomID,
							)

							return nil
						},
					),
				},

				On: brainy.Events{
					MtvRoomPlayEvent: brainy.Transition{
						Target: MtvRoomPlayingState,

						Cond: canPlayCurrentTrack(&internalState),
					},
				},
			},

			MtvRoomPlayingState: &brainy.StateNode{
				Initial: MtvRoomPlayingLauchingTimerState,

				States: brainy.StateNodes{
					MtvRoomPlayingLauchingTimerState: &brainy.StateNode{
						OnEntry: brainy.Actions{
							brainy.ActionFn(
								func(c brainy.Context, e brainy.Event) error {
									timerContext := c.(*MtvRoomMachineContext)
									childCtx, cancelHandler := workflow.WithCancel(ctx)
									timerContext.CancelTimer = cancelHandler

									encoded := workflow.SideEffect(ctx, func(ctx workflow.Context) interface{} {
										return time.Now()
									})
									var tmp time.Time

									encoded.Get(&tmp)
									timerContext.CreatedAt = tmp
									timerExpirationFuture = workflow.NewTimer(childCtx, timerContext.Timer.TotalDuration-timerContext.Timer.Elapsed)

									return nil
								},
							),
							brainy.ActionFn(
								func(c brainy.Context, e brainy.Event) error {
									options := workflow.ActivityOptions{
										ScheduleToStartTimeout: time.Minute,
										StartToCloseTimeout:    time.Minute,
									}
									ctx = workflow.WithActivityOptions(ctx, options)

									workflow.ExecuteActivity(
										ctx,
										activities.PlayActivity,
										internalState.Export(),
									)

									return nil
								},
							),
							brainy.Send(MtvRoomTimerLaunchedEvent),
						},

						On: brainy.Events{
							MtvRoomTimerLaunchedEvent: MtvRoomPlayingWaitingTimerEndState,
						},
					},

					MtvRoomPlayingWaitingTimerEndState: &brainy.StateNode{
						On: brainy.Events{
							MtvRoomTimerExpiredEvent: brainy.Transitions{
								{
									Cond: func(c brainy.Context, e brainy.Event) bool {
										timerExpirationEvent := e.(MtvRoomTimerExpirationEvent)
										currentTrackEnded := timerExpirationEvent.Timer.State == shared.MtvRoomTimerStateFinished
										hasReachedTracksListEnd := len(internalState.Tracks) == 0

										fmt.Printf("sortie 1111111111111111111 \n%+v\n", currentTrackEnded && hasReachedTracksListEnd)
										return currentTrackEnded && hasReachedTracksListEnd
									},

									Target: MtvRoomPlayingTimeoutExpiredState,

									Actions: brainy.Actions{
										brainy.ActionFn(
											func(c brainy.Context, e brainy.Event) error {
												ctx := c.(*MtvRoomMachineContext)
												event := e.(MtvRoomTimerExpirationEvent)

												ctx.Timer = event.Timer
												internalState.CurrentTrack.Elapsed = event.Timer.Elapsed

												return nil
											},
										),
									},
								},

								{
									Cond: func(c brainy.Context, e brainy.Event) bool {
										timerExpirationEvent := e.(MtvRoomTimerExpirationEvent)
										currentTrackEnded := timerExpirationEvent.Timer.State == shared.MtvRoomTimerStateFinished

										fmt.Printf("sortie 222222222222222222222222 \n%+v\n", currentTrackEnded)
										return currentTrackEnded
									},

									Target: MtvRoomPlayingLauchingTimerState,

									Actions: brainy.Actions{
										brainy.ActionFn(
											assignNextTracK(&internalState),
										),
									},
								},

								{
									Target: MtvRoomPlayingTimeoutExpiredState,

									Actions: brainy.Actions{
										brainy.ActionFn(
											func(c brainy.Context, e brainy.Event) error {
												fmt.Printf("sortie 3333333333333333333333333333333333333333333333333333")
												ctx := c.(*MtvRoomMachineContext)
												event := e.(MtvRoomTimerExpirationEvent)

												ctx.Timer = event.Timer
												internalState.CurrentTrack.Elapsed = event.Timer.Elapsed
												return nil
											},
										),
									},
								},
							},

							MtvRoomPauseEvent: brainy.Transition{
								Actions: brainy.Actions{
									brainy.ActionFn(
										func(c brainy.Context, e brainy.Event) error {
											timerContext := c.(*MtvRoomMachineContext)

											if cancel := timerContext.CancelTimer; cancel != nil {
												cancel()
											}

											return nil
										},
									),
								},
							},
						},
					},

					MtvRoomPlayingTimeoutExpiredState: &brainy.StateNode{
						OnEntry: brainy.Actions{
							brainy.Send(MtvRoomGoToPausedEvent),
						},
					},
				},

				On: brainy.Events{
					MtvRoomGoToPausedEvent: MtvRoomPausedState,
				},
			},
		},

		On: brainy.Events{
			MtvRoomAddUserEvent: brainy.Transition{
				Actions: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							event := e.(MtvRoomUserJoiningRoomEvent)

							internalState.AddUser(event.UserID)

							options := workflow.ActivityOptions{
								ScheduleToStartTimeout: time.Minute,
								StartToCloseTimeout:    time.Minute,
							}
							ctx = workflow.WithActivityOptions(ctx, options)
							workflow.ExecuteActivity(
								ctx,
								activities.JoinActivity,
								internalState.Export(),
								event.UserID,
							)

							return nil
						},
					),
				},
			},

			MtvRoomGoToNextTrackEvent: brainy.Transition{
				Target: MtvRoomPlayingState,

				Cond: hasNextTrackToPlay(&internalState),

				Actions: brainy.Actions{
					brainy.ActionFn(
						assignNextTracK(&internalState),
					),
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

				internalState.Machine.Send(MtvRoomPlayEvent)

			case shared.SignalRoutePause:
				var message shared.PauseSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

				internalState.Machine.Send(MtvRoomPauseEvent)

			case shared.SignalRouteJoin:
				var message shared.JoinSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

				internalState.Machine.Send(
					NewMtvRoomUserJoiningRoomEvent(message.UserID),
				)

			case shared.SignalRouteGoToNextTrack:
				var message shared.GoToNextTrackSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

				internalState.Machine.Send(MtvRoomGoToNextTrackEvent)

			case shared.SignalRouteTerminate:
				terminated = true
			}
		})

		if timerExpirationFuture != nil {
			selector.AddFuture(timerExpirationFuture, func(f workflow.Future) {
				var timerActivityResult shared.MtvRoomTimer
				timerExpirationFuture = nil

				fmt.Println("======================================")

				err := f.Get(ctx, nil)
				hasBeenCanceled := temporal.IsCanceledError(err)
				fmt.Println(f.Get(ctx, nil))

				if hasBeenCanceled {
					encoded := workflow.SideEffect(ctx, func(ctx workflow.Context) interface{} {
						return time.Now()
					})
					var now time.Time
					encoded.Get(&now)
					fmt.Printf("%+v\n", now)
					fmt.Printf("VERSUS\n")
					fmt.Printf("%+v\n", myContext.CreatedAt)

					timerActivityResult = shared.MtvRoomTimer{
						Elapsed:       now.Sub(myContext.CreatedAt),
						State:         shared.MtvRoomTimerStatePending,
						TotalDuration: myContext.Timer.TotalDuration,
					}
				} else {
					timerActivityResult = shared.MtvRoomTimer{
						Elapsed:       myContext.Timer.TotalDuration,
						State:         shared.MtvRoomTimerStateFinished,
						TotalDuration: myContext.Timer.TotalDuration,
					}
				}
				fmt.Printf("%+v\n", timerActivityResult)
				fmt.Printf("%+v\n", internalState.Machine.UnsafeCurrent().Value())

				fmt.Println("======================================")

				internalState.Machine.Send(
					NewMtvRoomTimerExpirationEvent(timerActivityResult),
				)
			})
		}

		// Room Is Ready callback
		if fetchedInitialTracksFuture != nil {
			selector.AddFuture(fetchedInitialTracksFuture, func(f workflow.Future) {
				fetchedInitialTracksFuture = nil

				var initialTracksActivityResult []shared.TrackMetadata

				if err := f.Get(ctx, &initialTracksActivityResult); err != nil {
					logger.Error("error occured initialTracksActivityResult", err)

					return
				}

				internalState.Machine.Send(
					NewMtvRoomInitialTracksFetchedEvent(initialTracksActivityResult),
				)
			})
		}
		/////

		selector.Select(ctx)

		if terminated || workflowFatalError != nil {
			break
		}
	}

	return workflowFatalError
}

func acknowledgeRoomCreation(ctx workflow.Context, state shared.MtvRoomExposedState) error {
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
