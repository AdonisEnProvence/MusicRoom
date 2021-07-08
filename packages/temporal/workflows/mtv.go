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

type MtvRoomInternalState struct {
	initialParams shared.MtvRoomParameters

	Machine       *brainy.Machine
	Users         []string
	TracksIDsList []string
	CurrentTrack  shared.TrackMetadata
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

	exposedState := shared.MtvRoomExposedState{
		RoomID:            s.initialParams.RoomID,
		RoomCreatorUserID: s.initialParams.RoomCreatorUserID,
		Playing:           isPlaying,
		RoomName:          s.initialParams.RoomName,
		Users:             s.Users,
		TracksIDsList:     s.TracksIDsList,
		CurrentTrack:      s.CurrentTrack,
		Tracks:            s.Tracks,
	}

	return exposedState
}

func (s *MtvRoomInternalState) AddUser(userID string) {
	s.Users = append(s.Users, userID)
}

type MtvRoomMachineContext struct {
	Timer       shared.MtvRoomTimer
	CancelTimer func()
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

	internalState.Machine, err = brainy.NewMachine(brainy.StateNode{
		Context: &MtvRoomMachineContext{
			Timer: shared.MtvRoomTimer{
				State:         shared.MtvRoomTimerStateIdle,
				Elapsed:       0,
				TotalDuration: internalState.CurrentTrack.Duration,
			},
		},

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
								func(c brainy.Context, e brainy.Event) error {
									event := e.(MtvRoomInitialTracksFetchedEvent)
									internalState.Tracks = event.Tracks

									if tracksCount := len(event.Tracks); tracksCount > 0 {
										currentTrack := internalState.Tracks[0]
										internalState.CurrentTrack = currentTrack

										if tracksCount == 1 {
											internalState.Tracks = []shared.TrackMetadata{}
											internalState.TracksIDsList = []string{}
										} else {
											internalState.Tracks = internalState.Tracks[1:]
											internalState.TracksIDsList = internalState.TracksIDsList[1:]
										}
									}

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
					MtvRoomPlayEvent: MtvRoomPlayingState,
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

									childCtx, cancel := workflow.WithCancel(ctx)
									timerContext.CancelTimer = cancel

									ao := workflow.ActivityOptions{
										StartToCloseTimeout: internalState.CurrentTrack.Duration * 2,
										HeartbeatTimeout:    5 * time.Second,
										WaitForCancellation: true,
									}
									childCtx = workflow.WithActivityOptions(childCtx, ao)

									timerExpirationFuture = workflow.ExecuteActivity(
										childCtx,
										activities.TrackTimerActivity,
										timerContext.Timer,
									)

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
										params.RoomID,
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

										return currentTrackEnded && hasReachedTracksListEnd
									},

									Target: MtvRoomPlayingTimeoutExpiredState,

									Actions: brainy.Actions{
										brainy.ActionFn(
											func(c brainy.Context, e brainy.Event) error {
												ctx := c.(*MtvRoomMachineContext)
												event := e.(MtvRoomTimerExpirationEvent)

												ctx.Timer = event.Timer

												return nil
											},
										),
									},
								},

								{
									Cond: func(c brainy.Context, e brainy.Event) bool {
										timerExpirationEvent := e.(MtvRoomTimerExpirationEvent)
										currentTrackEnded := timerExpirationEvent.Timer.State == shared.MtvRoomTimerStateFinished

										return currentTrackEnded
									},

									Target: MtvRoomPlayingLauchingTimerState,

									Actions: brainy.Actions{
										brainy.ActionFn(
											func(c brainy.Context, e brainy.Event) error {
												ctx := c.(*MtvRoomMachineContext)

												tracksCount := len(internalState.Tracks)
												internalState.CurrentTrack = internalState.Tracks[0]
												ctx.Timer = shared.MtvRoomTimer{
													State:         shared.MtvRoomTimerStateIdle,
													Elapsed:       0,
													TotalDuration: internalState.CurrentTrack.Duration,
												}

												if tracksCount == 1 {
													internalState.Tracks = []shared.TrackMetadata{}
													internalState.TracksIDsList = []string{}
												} else {
													internalState.Tracks = internalState.Tracks[1:]
													internalState.TracksIDsList = internalState.TracksIDsList[1:]
												}

												return nil
											},
										),
									},
								},

								{
									Target: MtvRoomPlayingTimeoutExpiredState,

									Actions: brainy.Actions{
										brainy.ActionFn(
											func(c brainy.Context, e brainy.Event) error {
												ctx := c.(*MtvRoomMachineContext)
												event := e.(MtvRoomTimerExpirationEvent)

												ctx.Timer = event.Timer

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
											ctx := c.(*MtvRoomMachineContext)

											if cancel := ctx.CancelTimer; cancel != nil {
												cancel()
											}

											return nil
										},
									),
									brainy.Send(MtvRoomGoToPausedEvent),
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

			case shared.SignalRouteTerminate:
				terminated = true
			}
		})

		if timerExpirationFuture != nil {
			selector.AddFuture(timerExpirationFuture, func(f workflow.Future) {
				timerExpirationFuture = nil

				var timerActivityResult shared.MtvRoomTimer

				if err := f.Get(ctx, &timerActivityResult); err != nil {
					logger.Error("error occured in timer activity", err)

					return
				}

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
