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

func (s *MtvRoomInternalState) Export(machineContext *MtvRoomMachineContext) shared.MtvRoomExposedState {
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
		now := TimeWrapper()
		elapsed := s.CurrentTrack.AlreadyElapsed

		dateIsNotZero := !machineContext.Timer.CreatedOn.IsZero()
		fmt.Printf("About to export %d %t %+v %t\n", elapsed, dateIsNotZero, machineContext.Timer, isPlaying)
		if dateIsNotZero && isPlaying {
			tmp := now.Sub(machineContext.Timer.CreatedOn)
			elapsed += tmp
			fmt.Printf("\nNeed to update elapsed because currently playing + %d for %d with now = %+v\n", tmp, elapsed, now)
		}

		tmp := s.CurrentTrack.Export(elapsed)
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

func GetElapsed(ctx workflow.Context, previous time.Time) time.Duration {
	if previous.IsZero() {
		fmt.Printf("FIND ZERO DATE ON GETELAPSED")
		return 0
	}
	encoded := workflow.SideEffect(ctx, func(ctx workflow.Context) interface{} {
		return TimeWrapper()
	})
	var now time.Time

	encoded.Get(&now)
	fmt.Printf("\nGET ELAPSED CALLED\n now = %+v \n %+v\n", now, now.Sub(previous))

	return now.Sub(previous)
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

	defaultTimer := shared.MtvRoomTimer{
		State:         shared.MtvRoomTimerStateIdle,
		CreatedOn:     time.Time{},
		TotalDuration: 0,
	}

	myContext := &MtvRoomMachineContext{
		Timer: defaultTimer,
	}

	internalState.FillWith(params)

	logger := workflow.GetLogger(ctx)

	if err := workflow.SetQueryHandler(
		ctx,
		shared.MtvGetStateQuery,
		func(input []byte) (shared.MtvRoomExposedState, error) {
			exposedState := internalState.Export(myContext)

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
								func(c brainy.Context, e brainy.Event) error {
									machineContext := c.(*MtvRoomMachineContext)
									if err := acknowledgeRoomCreation(ctx, internalState.Export(machineContext)); err != nil {
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
									machineContext := c.(*MtvRoomMachineContext)
									childCtx, cancelHandler := workflow.WithCancel(ctx)
									machineContext.CancelTimer = cancelHandler

									encoded := workflow.SideEffect(ctx, func(ctx workflow.Context) interface{} {
										return TimeWrapper()
									})
									var createdOn time.Time

									encoded.Get(&createdOn)
									// elapsed := GetElapsed(ctx, timerContext.Timer.CreatedOn)
									totalDuration := machineContext.Timer.TotalDuration - internalState.CurrentTrack.AlreadyElapsed

									machineContext.Timer.CreatedOn = createdOn
									machineContext.Timer.TotalDuration = totalDuration
									machineContext.Timer.State = shared.MtvRoomTimerStateIdle

									fmt.Println("-----------------NEW TIMER FOR-----------------")
									fmt.Printf("%+v\n", internalState.CurrentTrack)
									fmt.Printf("%+v\n", machineContext.Timer)
									fmt.Println("-----------------------------------------------")

									timerExpirationFuture = workflow.NewTimer(childCtx, totalDuration)

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

										return currentTrackEnded && hasReachedTracksListEnd
									},

									Target: MtvRoomPlayingTimeoutExpiredState,

									Actions: brainy.Actions{
										brainy.ActionFn(
											func(c brainy.Context, e brainy.Event) error {
												fmt.Println("__NO MORE TRACKS__")
												event := e.(MtvRoomTimerExpirationEvent)

												elapsed := GetElapsed(ctx, event.Timer.CreatedOn)
												fmt.Printf("\n currentTrack = %+v\n", internalState.CurrentTrack)
												fmt.Printf("\n elapsed to add = %+v\n", elapsed)
												internalState.CurrentTrack.StartedOn = time.Time{}
												internalState.CurrentTrack.AlreadyElapsed += elapsed

												return nil
											},
										),
									},
								},

								{
									Cond: func(c brainy.Context, e brainy.Event) bool {
										timerExpirationEvent := e.(MtvRoomTimerExpirationEvent)
										currentTrackEnded := timerExpirationEvent.Timer.State == shared.MtvRoomTimerStateFinished

										if currentTrackEnded {
											fmt.Println("__TRACK IS FINISHED GOING TO THE NEXT ONE__")
										}

										return currentTrackEnded
									},

									Target: MtvRoomPlayingLauchingTimerState,

									Actions: brainy.Actions{
										brainy.ActionFn(
											assignNextTracK(&internalState),
										),
									},
								},

								//Means has been cancelled e.g pause event
								{
									Target: MtvRoomPlayingTimeoutExpiredState,

									Actions: brainy.Actions{
										brainy.ActionFn(
											func(c brainy.Context, e brainy.Event) error {
												fmt.Println("__CURRENT TRACK TIMER HAS BEEN CANCELED__")
												event := e.(MtvRoomTimerExpirationEvent)

												elapsed := GetElapsed(ctx, event.Timer.CreatedOn)
												internalState.CurrentTrack.StartedOn = time.Time{}
												internalState.CurrentTrack.AlreadyElapsed += elapsed
												fmt.Printf("has been played before last timer = %d for a total of = %d\n", elapsed, internalState.CurrentTrack.AlreadyElapsed)
												fmt.Println("__________________________________________")

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
							machineContext := c.(*MtvRoomMachineContext)

							internalState.AddUser(event.UserID)

							options := workflow.ActivityOptions{
								ScheduleToStartTimeout: time.Minute,
								StartToCloseTimeout:    time.Minute,
							}
							ctx = workflow.WithActivityOptions(ctx, options)
							workflow.ExecuteActivity(
								ctx,
								activities.JoinActivity,
								internalState.Export(machineContext),
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

				fmt.Println("=================TIMER ENDED=====================")

				err := f.Get(ctx, nil)
				hasBeenCanceled := temporal.IsCanceledError(err)
				fmt.Printf("canceled = %t\n", hasBeenCanceled)
				fmt.Printf("Was createdOn = %+v\n", myContext.Timer)
				fmt.Printf("CurrentTrack = %+v\n", internalState.CurrentTrack)
				fmt.Printf("Now = %+v\n", TimeWrapper())

				if hasBeenCanceled {
					timerActivityResult = shared.MtvRoomTimer{
						State:         shared.MtvRoomTimerStatePending,
						TotalDuration: myContext.Timer.TotalDuration,
						CreatedOn:     myContext.Timer.CreatedOn,
					}
				} else {
					timerActivityResult = shared.MtvRoomTimer{
						State:         shared.MtvRoomTimerStateFinished,
						TotalDuration: myContext.Timer.TotalDuration,
						CreatedOn:     myContext.Timer.CreatedOn,
					}
					myContext.Timer = defaultTimer
					myContext.CancelTimer = nil
				}

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

type TimeWrapperType func() time.Time

var TimeWrapper TimeWrapperType = func() time.Time {
	fmt.Printf("PEPITO")
	return time.Now()
}
