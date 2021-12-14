package mpe

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	activities_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/activities"
	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/mitchellh/mapstructure"

	"github.com/Devessier/brainy"

	"go.temporal.io/sdk/workflow"
)

var (
	ErrRoomDoesNotHaveConstraints = errors.New("room does not have constraints")
	ErrUnknownWorflowSignal       = errors.New("encountered an unkown MPE workflow signal")
)

type MpeRoomInternalState struct {
	initialParams shared_mpe.MpeRoomParameters
	Machine       *brainy.Machine
	Users         map[string]*shared_mpe.InternalStateUser
	Tracks        shared_mpe.TrackMetadataSet
}

func (s *MpeRoomInternalState) AddUser(user shared_mpe.InternalStateUser) {
	//Do not override user if already exist
	if _, ok := s.Users[user.UserID]; !ok {
		s.Users[user.UserID] = &user
	} else {
		fmt.Printf("\n User %s already existing in s.Users\n", user.UserID)
	}
}

func (s *MpeRoomInternalState) GetUserRelatedInformation(userID string) *shared_mpe.InternalStateUser {
	if userInformation, ok := s.Users[userID]; userID != shared_mpe.NoRelatedUserID && ok {
		return userInformation
	}
	return nil
}

func (s *MpeRoomInternalState) getRoomIsOpenAndOnlyInvitedUsersCanEdit() bool {
	return s.initialParams.IsOpen && s.initialParams.IsOpenOnlyInvitedUsersCanEdit
}

//This method will merge given params in the internalState
func (s *MpeRoomInternalState) FillWith(params shared_mpe.MpeRoomParameters) {
	s.initialParams = params
	s.Tracks.Init()
	s.Users = make(map[string]*shared_mpe.InternalStateUser)
	s.AddUser(*params.CreatorUserRelatedInformation)
}

// In the internalState.Export method we do not use workflow.sideEffect for at least two reasons:
// 1- we cannot use workflow.sideEffect in the getState queryHandler
// 2- we never update our internalState depending on internalState.Export() results this data aims to be sent to adonis.
func (s *MpeRoomInternalState) Export() shared_mpe.MpeRoomExposedState {

	exposedState := shared_mpe.MpeRoomExposedState{
		UsersLength:                   len(s.Users),
		RoomID:                        s.initialParams.RoomID,
		RoomName:                      s.initialParams.RoomName,
		RoomCreatorUserID:             s.initialParams.RoomCreatorUserID,
		IsOpen:                        s.initialParams.IsOpen,
		IsOpenOnlyInvitedUsersCanEdit: s.initialParams.IsOpenOnlyInvitedUsersCanEdit,
		Tracks:                        s.Tracks.Values(),
		PlaylistTotalDuration:         42000, //TODO or not depend where we want to compute this data
	}

	return exposedState
}

const (
	MpeRoomFetchInitialTrack brainy.StateType = "fetching-initial-track"
	MpeRoomReady             brainy.StateType = "ready"

	MpeRoomInitialTracksFetched                   brainy.EventType = "INITIAL_TRACK_FETCHED"
	MpeRoomAddTracksEventType                     brainy.EventType = "ADD_TRACKS"
	MpeRoomAddedTracksInformationFetchedEventType brainy.EventType = "ADDED_TRACKS_INFORMATION_FETCHED"
	MpeRoomChangeTrackOrderEventType              brainy.EventType = "CHANGE_TRACK_ORDER"
	MpeRoomDeleteTracksEventType                  brainy.EventType = "DELETE_TRACKS"
)

func getNowFromSideEffect(ctx workflow.Context) time.Time {
	var now time.Time
	encoded := workflow.SideEffect(ctx, func(ctx workflow.Context) interface{} {
		return TimeWrapper()
	})
	encoded.Get(&now)
	return now
}

func MpeRoomWorkflow(ctx workflow.Context, params shared_mpe.MpeRoomParameters) error {
	var (
		err           error
		internalState MpeRoomInternalState
	)

	logger := workflow.GetLogger(ctx)

	//Checking params
	rootNow := getNowFromSideEffect(ctx)

	if err := Validate.Struct(params); err != nil {
		log.Println("create mpe room params validation error", err)
		return errors.New("validate params failed")
	}

	if err := params.CheckParamsValidity(rootNow); err != nil {
		logger.Info("Workflow creation failed", "Error", err)
		return err
	}
	///
	internalState.FillWith(params)

	if err := workflow.SetQueryHandler(
		ctx,
		shared_mpe.MpeGetStateQuery,
		func(userID string) (shared_mpe.MpeRoomExposedState, error) {

			exposedState := internalState.Export()

			return exposedState, nil
		},
	); err != nil {
		logger.Info("SetQueryHandler for MtvGetStateQuery failed.", "Error", err)
		return err
	}

	channel := workflow.GetSignalChannel(ctx, shared_mpe.SignalChannelName)

	var (
		terminated                           = false
		workflowFatalError                   error
		fetchedInitialTracksFuture           workflow.Future
		fetchedAddedTracksInformationFutures []workflow.Future
	)

	//create machine here
	internalState.Machine, err = brainy.NewMachine(brainy.StateNode{
		Initial: MpeRoomFetchInitialTrack,

		States: brainy.StateNodes{

			MpeRoomFetchInitialTrack: &brainy.StateNode{
				OnEntry: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {

							fetchedInitialTracksFuture = sendFetchTracksInformationActivity(ctx, internalState.initialParams.InitialTracksIDs)

							return nil
						},
					),
				},

				On: brainy.Events{
					MpeRoomInitialTracksFetched: brainy.Transition{
						Target: MpeRoomReady,

						Actions: brainy.Actions{
							brainy.ActionFn(
								assignInitialFetchedTracks(&internalState),
							),
							brainy.ActionFn(
								func(c brainy.Context, e brainy.Event) error {
									acknowledgeRoomCreation(
										ctx,
										internalState.Export(),
									)

									return nil
								},
							),
						},
					},
				},
			},

			MpeRoomReady: &brainy.StateNode{
				On: brainy.Events{
					MpeRoomAddTracksEventType: brainy.Transition{
						//Add cond here ( user exists and user has been invited nor is creator )

						Actions: brainy.Actions{
							brainy.ActionFn(
								func(c brainy.Context, e brainy.Event) error {
									event := e.(MpeRoomAddTracksEvent)

									acceptedTracksIDsToAdd := make([]string, 0, len(event.TracksIDs))

									for _, trackToAdd := range event.TracksIDs {
										isDuplicate := internalState.Tracks.Has(trackToAdd)
										if isDuplicate {
											continue
										}

										acceptedTracksIDsToAdd = append(acceptedTracksIDsToAdd, trackToAdd)
									}

									noTracksHaveBeenAccepted := len(acceptedTracksIDsToAdd) == 0
									if noTracksHaveBeenAccepted {
										sendRejectAddingTracksActivity(ctx, activities_mpe.RejectAddingTracksActivityArgs{
											RoomID:   params.RoomID,
											UserID:   event.UserID,
											DeviceID: event.DeviceID,
										})

										return nil
									}

									fetchingFuture := sendFetchTracksInformationActivityAndForwardInitiator(
										ctx,
										acceptedTracksIDsToAdd,
										event.UserID,
										event.DeviceID,
									)
									fetchedAddedTracksInformationFutures = append(fetchedAddedTracksInformationFutures, fetchingFuture)

									return nil
								},
							),
						},
					},

					MpeRoomAddedTracksInformationFetchedEventType: brainy.Transition{
						Actions: brainy.Actions{
							brainy.ActionFn(
								func(c brainy.Context, e brainy.Event) error {
									event := e.(MpeRoomAddedTracksInformationFetchedEvent)

									// If all tracks to add are already in the playlist, abort the operation.
									allTracksAreDuplicated := true
									for _, track := range event.AddedTracksInformation {
										if trackIsNotDuplicated := !internalState.Tracks.Has(track.ID); trackIsNotDuplicated {
											allTracksAreDuplicated = false

											break
										}
									}

									if allTracksAreDuplicated {
										sendRejectAddingTracksActivity(ctx, activities_mpe.RejectAddingTracksActivityArgs{
											RoomID:   params.RoomID,
											UserID:   event.UserID,
											DeviceID: event.DeviceID,
										})

										return nil
									}

									for _, track := range event.AddedTracksInformation {
										internalState.Tracks.Add(track)
									}

									sendAcknowledgeAddingTracksActivity(ctx, activities_mpe.AcknowledgeAddingTracksActivityArgs{
										State:    internalState.Export(),
										UserID:   event.UserID,
										DeviceID: event.DeviceID,
									})

									return nil
								},
							),
						},
					},

					MpeRoomChangeTrackOrderEventType: brainy.Transitions{
						{
							Cond: userCanPerformChangeTrackPlaylistEditionOperation(&internalState),

							Actions: brainy.Actions{
								brainy.ActionFn(
									changeTrackOrder(ctx, &internalState),
								),
							},
						},
						{
							Actions: brainy.Actions{
								brainy.ActionFn(
									func(c brainy.Context, e brainy.Event) error {
										fmt.Println("userCanPerformChangeTrackPlaylistEditionOperation is false")
										event := e.(MpeRoomChangeTrackOrderEvent)

										sendRejectChangeTrackOrderActivity(ctx, activities_mpe.RejectChangeTrackOrderActivityArgs{
											DeviceID: event.DeviceID,
											UserID:   event.UserID,
										})
										return nil
									}),
							},
						},
					},

					MpeRoomDeleteTracksEventType: brainy.Transitions{
						{
							Cond: userCanPerformDeleteTracksOperation(&internalState),

							Actions: brainy.Actions{
								brainy.ActionFn(
									func(c brainy.Context, e brainy.Event) error {
										event := e.(MpeRoomDeleteTracksEvent)

										for _, trackID := range event.TracksIDs {
											internalState.Tracks.Delete(trackID)
										}

										sendAcknowledgeDeletingTracksActivity(ctx, activities_mpe.AcknowledgeDeletingTracksActivityArgs{
											State:    internalState.Export(),
											UserID:   event.UserID,
											DeviceID: event.DeviceID,
										})

										return nil
									},
								),
							},
						},
					},
				},
			},
		},

		On: brainy.Events{},
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
			case shared_mpe.SignalAddTracks:
				var message shared_mpe.AddTracksSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
				if err := Validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}

				internalState.Machine.Send(
					NewMpeRoomAddTracksEvent(NewMpeRoomAddTracksEventArgs{
						TracksIDs: message.TracksIDs,
						UserID:    message.UserID,
						DeviceID:  message.DeviceID,
					}),
				)

			case shared_mpe.SignalChangeTrackOrder:
				var message shared_mpe.ChangeTrackOrderSignal
				fmt.Printf("\n RECEIVED SIGNAL SignalChangeTrackOrder \n%+v\n", signal)
				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
				if err := Validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}
				fmt.Printf("\n RECEIVED SIGNAL SignalChangeTrackOrder \n%+v\n", message)

				operationToApplyIsNotValid := !message.OperationToApply.IsValid()
				if operationToApplyIsNotValid {
					logger.Error("OperationToApplyValue is invalid", errors.New("OperationToApplyValue is invalid"))
					return
				}

				internalState.Machine.Send(
					NewMpeRoomChangeTrackOrderEvent(NewMpeRoomChangeTrackOrderEventArgs{
						TrackID:          message.TrackID,
						UserID:           message.UserID,
						DeviceID:         message.DeviceID,
						OperationToApply: message.OperationToApply,
						FromIndex:        message.FromIndex,
					}),
				)

			case shared_mpe.SignalDeleteTracks:
				var message shared_mpe.DeleteTracksSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
				if err := Validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}

				internalState.Machine.Send(
					NewMpeRoomDeleteTracksEvent(NewMpeRoomDeleteTracksEventArgs{
						TracksIDs: message.TracksIDs,
						UserID:    message.UserID,
						DeviceID:  message.DeviceID,
					}),
				)

			default:
				panic(ErrUnknownWorflowSignal)
			}
		})

		if fetchedInitialTracksFuture != nil {
			selector.AddFuture(fetchedInitialTracksFuture, func(f workflow.Future) {
				fetchedInitialTracksFuture = nil

				var initialTrackActivityResult []shared.TrackMetadata

				if err := f.Get(ctx, &initialTrackActivityResult); err != nil {
					logger.Error("error occured initialTrackActivityResult", err)

					return
				}

				fmt.Println("**********************************")
				fmt.Printf("\n%+v\n", initialTrackActivityResult)
				fmt.Println("**********************************")
				internalState.Machine.Send(
					NewMpeRoomInitialTracksFetchedEvent(initialTrackActivityResult),
				)
			})
		}

		for index, fetchedAddedTracksInformationFuture := range fetchedAddedTracksInformationFutures {
			selector.AddFuture(fetchedAddedTracksInformationFuture, func(f workflow.Future) {
				fetchedAddedTracksInformationFutures = removeFutureFromSlice(fetchedAddedTracksInformationFutures, index)

				var addedTracksInformationActivityResult activities.FetchedTracksInformationWithInitiator

				if err := f.Get(ctx, &addedTracksInformationActivityResult); err != nil {
					logger.Error("error occured initialTracksActivityResult", err)

					return
				}

				internalState.Machine.Send(
					NewMpeRoomAddedTracksInformationFetchedEvent(NewMpeRoomAddedTracksInformationFetchedEventArgs{
						AddedTracksInformation: addedTracksInformationActivityResult.Metadata,
						UserID:                 addedTracksInformationActivityResult.UserID,
						DeviceID:               addedTracksInformationActivityResult.DeviceID,
					}),
				)
			})
		}

		selector.Select(ctx)

		if terminated || workflowFatalError != nil {
			break
		}
	}

	return workflowFatalError
}

func acknowledgeRoomCreation(ctx workflow.Context, state shared_mpe.MpeRoomExposedState) error {
	ao := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var a *activities_mpe.Activities
	if err := workflow.ExecuteActivity(
		ctx,
		a.MpeCreationAcknowledgementActivity,
		state,
	).Get(ctx, nil); err != nil {
		return err
	}

	return nil
}

type TimeWrapperType func() time.Time

var TimeWrapper TimeWrapperType = time.Now

func removeFutureFromSlice(slice []workflow.Future, index int) []workflow.Future {
	slice[index] = slice[len(slice)-1]
	return slice[:len(slice)-1]
}
