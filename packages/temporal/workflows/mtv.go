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
	Users         map[string]*shared.InternalStateUser
	TracksIDsList []string
	CurrentTrack  shared.CurrentTrack
	Tracks        []shared.TrackMetadata
	Playing       bool
	Timer         shared.MtvRoomTimer
}

//TODO REMOVE STARTEDON PROPS FROM CURRENTTRACK

func (s *MtvRoomInternalState) FillWith(params shared.MtvRoomParameters) {
	s.initialParams = params

	//InitialUsers now unused
	s.Users = make(map[string]*shared.InternalStateUser)
	s.Users = params.InitialUsers
	s.TracksIDsList = params.InitialTracksIDsList
}

func (s *MtvRoomInternalState) Export() shared.MtvRoomExposedState {
	exposedTracks := make([]shared.ExposedTrackMetadata, 0, len(s.Tracks))
	for _, v := range s.Tracks {
		exposedTracks = append(exposedTracks, v.Export())
	}

	var currentTrackToExport *shared.ExposedCurrentTrack = nil
	if s.CurrentTrack.ID != "" {
		now := TimeWrapper()
		elapsed := s.CurrentTrack.AlreadyElapsed

		dateIsZero := s.Timer.CreatedOn.IsZero()
		dateIsNotZero := !dateIsZero

		if dateIsNotZero && s.Playing {
			elapsed += now.Sub(s.Timer.CreatedOn)
		}

		tmp := s.CurrentTrack.Export(elapsed)
		currentTrackToExport = &tmp
	}

	exposedState := shared.MtvRoomExposedState{
		RoomID:            s.initialParams.RoomID,
		RoomCreatorUserID: s.initialParams.RoomCreatorUserID,
		Playing:           s.Playing,
		RoomName:          s.initialParams.RoomName,
		Users:             s.Users,
		TracksIDsList:     s.TracksIDsList,
		CurrentTrack:      currentTrackToExport,
		Tracks:            exposedTracks,
	}

	return exposedState
}

func (s *MtvRoomInternalState) AddUser(user shared.InternalStateUser) {
	s.Users[user.UserID] = &user
}

func (s *MtvRoomInternalState) UpdateUserDeviceID(user shared.InternalStateUser) {
	s.Users[user.UserID].DeviceID = user.DeviceID
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

	MtvRoomPlayEvent                brainy.EventType = "PLAY"
	MtvRoomPauseEvent               brainy.EventType = "PAUSE"
	MtvRoomTimerLaunchedEvent       brainy.EventType = "TIMER_LAUNCHED"
	MtvRoomTimerExpiredEvent        brainy.EventType = "TIMER_EXPIRED"
	MtvRoomInitialTracksFetched     brainy.EventType = "INITIAL_TRACKS_FETCHED"
	MtvRoomIsReady                  brainy.EventType = "MTV_ROOM_IS_READY"
	MtvRoomGoToPausedEvent          brainy.EventType = "GO_TO_PAUSED"
	MtvRoomAddUserEvent             brainy.EventType = "ADD_USER"
	MtvRoomGoToNextTrackEvent       brainy.EventType = "GO_TO_NEXT_TRACK"
	MtvRoomChangeUserEmittingDevice brainy.EventType = "CHANGE_USER_EMITTING_DEVICE"
)

type MtvRoomTimerExpirationEvent struct {
	brainy.EventWithType

	Timer  shared.MtvRoomTimer
	Reason shared.MtvRoomTimerExpiredReason
}

type MtvRoomInitialTracksFetchedEvent struct {
	brainy.EventWithType

	Tracks []shared.TrackMetadata
}

func GetElapsed(ctx workflow.Context, previous time.Time) time.Duration {
	if previous.IsZero() {
		return 0
	}
	encoded := workflow.SideEffect(ctx, func(ctx workflow.Context) interface{} {
		return TimeWrapper()
	})
	var now time.Time

	encoded.Get(&now)

	return now.Sub(previous)
}

func NewMtvRoomTimerExpirationEvent(t shared.MtvRoomTimer, reason shared.MtvRoomTimerExpiredReason) MtvRoomTimerExpirationEvent {

	return MtvRoomTimerExpirationEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomTimerExpiredEvent,
		},
		Timer:  t,
		Reason: reason,
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

	User shared.InternalStateUser
}

func NewMtvRoomUserJoiningRoomEvent(user shared.InternalStateUser) MtvRoomUserJoiningRoomEvent {
	return MtvRoomUserJoiningRoomEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomAddUserEvent,
		},

		User: user,
	}
}

type MtvRoomChangeUserEmittingDeviceEvent struct {
	brainy.EventWithType

	UserID   string
	DeviceID string
}

func NewMtvRoomChangeUserEmittingDeviceEvent(userID string, deviceID string) MtvRoomChangeUserEmittingDeviceEvent {
	return MtvRoomChangeUserEmittingDeviceEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomChangeUserEmittingDevice,
		},

		UserID:   userID,
		DeviceID: deviceID,
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
			// Here we do not use workflow.sideEffect for at least two reasons:
			// 1- we cannot use workflow.sideEffect in the getState queryHandler
			// 2- we never update our internalState depending on internalState.Export() results
			// this data aims to be sent to adonis.
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

				OnExit: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							internalState.Playing = false
							return nil
						},
					),
				},

				States: brainy.StateNodes{
					MtvRoomPlayingLauchingTimerState: &brainy.StateNode{
						OnEntry: brainy.Actions{
							brainy.ActionFn(
								func(c brainy.Context, e brainy.Event) error {

									fmt.Println("-------------ENTERED PLAYING STATE")
									childCtx, cancelTimerHandler := workflow.WithCancel(ctx)

									var createdOn time.Time
									encoded := workflow.SideEffect(ctx, func(ctx workflow.Context) interface{} {
										return TimeWrapper()
									})
									encoded.Get(&createdOn)

									totalDuration := internalState.CurrentTrack.Duration - internalState.CurrentTrack.AlreadyElapsed

									internalState.Timer = shared.MtvRoomTimer{
										Cancel:    cancelTimerHandler,
										CreatedOn: createdOn,
										Duration:  totalDuration,
									}

									fmt.Println("-----------------NEW TIMER FOR-----------------")
									fmt.Printf("%+v\n", internalState.CurrentTrack)
									fmt.Printf("%+v\n", internalState.Timer)
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

									// To do not corrupt the elapsed on a paused room with the freshly created timer
									// but also set as playing true a previously paused room after a go to next track event
									// we need to mutate and update the internalState after the internalState.Export()
									exposedInternalState := internalState.Export()
									exposedInternalState.Playing = true
									internalState.Playing = true

									workflow.ExecuteActivity(
										ctx,
										activities.PlayActivity,
										exposedInternalState,
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
										currentTrackEnded := timerExpirationEvent.Reason == shared.MtvRoomTimerExpiredReasonFinished
										hasReachedTracksListEnd := len(internalState.Tracks) == 0

										return currentTrackEnded && hasReachedTracksListEnd
									},

									Target: MtvRoomPlayingTimeoutExpiredState,

									Actions: brainy.Actions{
										brainy.ActionFn(
											func(c brainy.Context, e brainy.Event) error {
												fmt.Println("__NO MORE TRACKS__")
												event := e.(MtvRoomTimerExpirationEvent)

												internalState.CurrentTrack.StartedOn = time.Time{}
												internalState.CurrentTrack.AlreadyElapsed += event.Timer.Duration

												return nil
											},
										),
									},
								},

								{
									Cond: func(c brainy.Context, e brainy.Event) bool {
										timerExpirationEvent := e.(MtvRoomTimerExpirationEvent)
										currentTrackEnded := timerExpirationEvent.Reason == shared.MtvRoomTimerExpiredReasonFinished

										if currentTrackEnded {
											fmt.Println("__TRACK IS FINISHED GOING TO THE NEXT ONE__")
										}

										return currentTrackEnded
									},

									Target: MtvRoomPlayingLauchingTimerState,

									Actions: brainy.Actions{
										brainy.ActionFn(
											assignNextTrack(&internalState),
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

											if cancel := internalState.Timer.Cancel; cancel != nil {
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

			MtvRoomChangeUserEmittingDevice: brainy.Transition{
				Actions: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							event := e.(MtvRoomChangeUserEmittingDeviceEvent)

							user := shared.InternalStateUser{
								UserID:   event.UserID,
								DeviceID: event.DeviceID,
							}
							internalState.UpdateUserDeviceID(user)
							return nil
						},
					),
				},
			},

			// Isn't risky to listen those events while we're in the state `MtvRoomFetchInitialTracks` ?
			// Shall we create a intermediate state between ? something like `workflowIsReady` ?
			MtvRoomAddUserEvent: brainy.Transition{
				Actions: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							event := e.(MtvRoomUserJoiningRoomEvent)

							internalState.AddUser(event.User)

							options := workflow.ActivityOptions{
								ScheduleToStartTimeout: time.Minute,
								StartToCloseTimeout:    time.Minute,
							}
							ctx = workflow.WithActivityOptions(ctx, options)
							workflow.ExecuteActivity(
								ctx,
								activities.JoinActivity,
								internalState.Export(),
								event.User.UserID,
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
						assignNextTrack(&internalState),
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

				user := shared.InternalStateUser{
					UserID:   message.UserID,
					DeviceID: message.DeviceID,
				}

				internalState.Machine.Send(
					NewMtvRoomUserJoiningRoomEvent(user),
				)

			case shared.SignalRouteGoToNextTrack:
				var message shared.GoToNextTrackSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

				internalState.Machine.Send(MtvRoomGoToNextTrackEvent)

			case shared.SignalRouteChangeUserEmittingDevice:
				var message shared.ChangeUserEmittingDeviceSignal

				fmt.Println("*********Signal handler**********")
				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}

				internalState.Machine.Send(
					NewMtvRoomChangeUserEmittingDeviceEvent(message.UserID, message.DeviceID),
				)

			case shared.SignalRouteTerminate:
				terminated = true
			}
		})

		if timerExpirationFuture != nil {
			selector.AddFuture(timerExpirationFuture, func(f workflow.Future) {
				var reason shared.MtvRoomTimerExpiredReason
				timerExpirationFuture = nil
				timerCopy := shared.MtvRoomTimer{
					Cancel:    nil,
					Duration:  internalState.Timer.Duration,
					CreatedOn: internalState.Timer.CreatedOn,
				}

				err := f.Get(ctx, nil)
				hasBeenCanceled := temporal.IsCanceledError(err)

				fmt.Println("=================TIMER ENDED=====================")
				fmt.Printf("canceled = %t\n", hasBeenCanceled)
				fmt.Printf("Was createdOn = %+v\n", internalState.Timer)
				fmt.Printf("CurrentTrack = %+v\n", internalState.CurrentTrack)
				fmt.Printf("Now = %+v\n", TimeWrapper())
				fmt.Println("======================================")

				if hasBeenCanceled {
					reason = shared.MtvRoomTimerExpiredReasonCanceled
				} else {
					reason = shared.MtvRoomTimerExpiredReasonFinished
				}

				internalState.Timer = shared.MtvRoomTimer{
					Cancel:    nil,
					Duration:  0,
					CreatedOn: time.Time{},
				}
				internalState.Machine.Send(
					NewMtvRoomTimerExpirationEvent(timerCopy, reason),
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
	return time.Now()
}
