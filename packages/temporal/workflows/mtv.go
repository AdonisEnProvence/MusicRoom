package workflows

import (
	"errors"
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

	Machine                                *brainy.Machine
	Users                                  map[string]*shared.InternalStateUser
	CurrentTrack                           shared.CurrentTrack
	Tracks                                 shared.TracksMetadataWithScoreSet
	Playing                                bool
	Timer                                  shared.MtvRoomTimer
	TracksCheckForVoteUpdateLastSave       shared.TracksMetadataWithScoreSet
	CurrentTrackCheckForVoteUpdateLastSave shared.CurrentTrack
	DelegationOwnerUserID                  *string
}

func (s *MtvRoomInternalState) FillWith(params shared.MtvRoomParameters) {
	s.initialParams = params
	s.Users = params.InitialUsers
	s.DelegationOwnerUserID = nil

	if params.PlayingMode == shared.MtvPlayingModeDirect {
		s.DelegationOwnerUserID = &params.RoomCreatorUserID
	}
}

func (s *MtvRoomInternalState) GetTimeConstraintValue() *bool {
	if !s.initialParams.HasPhysicalAndTimeConstraints {
		return nil
	}

	start := s.initialParams.PhysicalAndTimeConstraints.PhysicalConstraintStartsAt
	end := s.initialParams.PhysicalAndTimeConstraints.PhysicalConstraintEndsAt
	now := TimeWrapper()

	nowIsBetweenStartAndEnd := now.After(start) && now.Before(end)

	return &nowIsBetweenStartAndEnd
}

func (s *MtvRoomInternalState) Export(RelatedUserID string) shared.MtvRoomExposedState {
	tracks := s.Tracks.Values()
	exposedTracks := make([]shared.TrackMetadataWithScoreWithDuration, 0, len(tracks))
	for _, track := range tracks {
		exposedTracks = append(exposedTracks, track.WithMillisecondsDuration())
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
		RoomID:                            s.initialParams.RoomID,
		RoomCreatorUserID:                 s.initialParams.RoomCreatorUserID,
		Playing:                           s.Playing,
		RoomName:                          s.initialParams.RoomName,
		CurrentTrack:                      currentTrackToExport,
		Tracks:                            exposedTracks,
		UsersLength:                       len(s.Users),
		MinimumScoreToBePlayed:            s.initialParams.MinimumScoreToBePlayed,
		RoomHasTimeAndPositionConstraints: s.initialParams.HasPhysicalAndTimeConstraints,
		TimeConstraintIsValid:             s.GetTimeConstraintValue(),
		UserRelatedInformation:            s.GetUserRelatedInformation(RelatedUserID),
		PlayingMode:                       s.initialParams.PlayingMode,
		IsOpen:                            s.initialParams.IsOpen,
		IsOpenOnlyInvitedUsersCanVotes:    s.initialParams.IsOpenOnlyInvitedUsersCanVote,
		DelegationOwnerUserID:             s.DelegationOwnerUserID,
	}

	return exposedState
}

func (s *MtvRoomInternalState) AddUser(user shared.InternalStateUser) {
	//Do not override user if already exist
	if _, ok := s.Users[user.UserID]; !ok {
		s.Users[user.UserID] = &user
	} else {
		fmt.Printf("\n User %s already existing in s.Users\n", user.UserID)
	}
}

func (s *MtvRoomInternalState) RemoveTrackFromUserTracksVotedFor(trackID string) {
	for _, user := range s.Users {
		lastTracksVotedForElementIndex := len(user.TracksVotedFor) - 1

		for index, trackVotedForID := range user.TracksVotedFor {
			if trackVotedForID == trackID {
				//remove element from slice
				user.TracksVotedFor[index] = user.TracksVotedFor[lastTracksVotedForElementIndex]
				user.TracksVotedFor = user.TracksVotedFor[:lastTracksVotedForElementIndex]
				break
			}
		}
	}
}

func (s *MtvRoomInternalState) RemoveUser(userID string) bool {
	if _, ok := s.Users[userID]; ok {
		delete(s.Users, userID)
		return true
	}
	fmt.Printf("\n Couldnt find User %s \n", userID)
	return false
}

func (s *MtvRoomInternalState) UpdateUserFitsPositionConstraint(userID string, userFitsPositionConstraint bool) bool {
	if user, ok := s.Users[userID]; ok {
		user.UserFitsPositionConstraint = &userFitsPositionConstraint
		return true
	}
	fmt.Printf("\n Couldnt find User %s \n", userID)
	return false
}

func (s *MtvRoomInternalState) UserVoteForTrack(userID string, trackID string) bool {

	user, exists := s.Users[userID]
	if !exists {
		fmt.Println("vote aborted: couldnt find given userID in the users list")
		return false
	}

	if s.initialParams.HasPhysicalAndTimeConstraints {
		timeConstraintValue := s.GetTimeConstraintValue()
		timeConstraintIsNotValid := timeConstraintValue == nil || !*(timeConstraintValue)
		userPositionConstraintIsNotValid := user.UserFitsPositionConstraint == nil || !*(user.UserFitsPositionConstraint)

		if timeConstraintIsNotValid || userPositionConstraintIsNotValid {
			fmt.Println("vote aborted: user doesnt fit the room position nor time constraints")
			return false
		}
	}

	roomIsOpenAndOnlyInvitedUsersCanVote := s.initialParams.IsOpen && s.initialParams.IsOpenOnlyInvitedUsersCanVote
	if roomIsOpenAndOnlyInvitedUsersCanVote {
		userIsNotRoomCreator := user.UserID != s.initialParams.RoomCreatorUserID
		userHasNotBeenInvited := !user.UserHasBeenInvited

		userIsNeitherInvitedOrCreator := userIsNotRoomCreator && userHasNotBeenInvited
		if userIsNeitherInvitedOrCreator {
			fmt.Println("vote aborted: room is open and only invited users can vote, voting user has not been invited")
			return false
		}
	}

	couldFindTrackInTracksList := s.Tracks.Has(trackID)
	if !couldFindTrackInTracksList {
		fmt.Println("vote aborted: couldnt find given trackID in the tracks list")
		return false
	}

	userAlreadyVotedForTrack := user.HasVotedFor(trackID)
	if userAlreadyVotedForTrack {
		fmt.Println("vote aborted: given userID has already voted for given trackID")
		return false
	}

	user.TracksVotedFor = append(user.TracksVotedFor, trackID)

	s.Tracks.IncrementTrackScoreAndSortTracks(trackID)

	return true
}

func (s *MtvRoomInternalState) UpdateUserDeviceID(user shared.InternalStateUser) {
	if val, ok := s.Users[user.UserID]; ok {
		val.DeviceID = user.DeviceID
	} else {
		fmt.Printf("\n User %s not found in s.Users\n", user.UserID)
	}
}

func (s *MtvRoomInternalState) GetUserRelatedInformation(userID string) *shared.InternalStateUser {
	if userInformation, ok := s.Users[userID]; userID != shared.NoRelatedUserID && ok {
		return userInformation
	}
	return nil
}

func (s *MtvRoomInternalState) UserHasControlAndDelegationPermission(userID string) bool {

	user := s.GetUserRelatedInformation(userID)
	if user == nil {
		return false
	}

	return user.HasControlAndDelegationPermission
}

func (s *MtvRoomInternalState) HasUser(userID string) bool {
	_, exists := s.Users[userID]

	return exists
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

	MtvRoomPlay                                   brainy.EventType = "PLAY"
	MtvRoomPause                                  brainy.EventType = "PAUSE"
	MtvRoomTimerLaunchedEvent                     brainy.EventType = "TIMER_LAUNCHED"
	MtvRoomTimerExpiredEvent                      brainy.EventType = "TIMER_EXPIRED"
	MtvRoomInitialTracksFetched                   brainy.EventType = "INITIAL_TRACKS_FETCHED"
	MtvRoomIsReady                                brainy.EventType = "MTV_ROOM_IS_READY"
	MtvCheckForScoreUpdateIntervalExpirationEvent brainy.EventType = "VOTE_UPDATE_INTERVAL_EXPIRATION"
	MtvRoomGoToPausedEvent                        brainy.EventType = "GO_TO_PAUSED"
	MtvRoomAddUserEvent                           brainy.EventType = "ADD_USER"
	MtvRoomRemoveUserEvent                        brainy.EventType = "REMOVE_USER"
	MtvRoomVoteForTrackEvent                      brainy.EventType = "VOTE_FOR_TRACK"
	MtvRoomUpdateUserFitsPositionConstraint       brainy.EventType = "UPDATE_USER_FITS_POSITION_CONSTRAINT"
	MtvRoomGoToNextTrack                          brainy.EventType = "GO_TO_NEXT_TRACK"
	MtvRoomChangeUserEmittingDevice               brainy.EventType = "CHANGE_USER_EMITTING_DEVICE"
	MtvRoomSuggestTracks                          brainy.EventType = "SUGGEST_TRACKS"
	MtvRoomSuggestedTracksFetched                 brainy.EventType = "SUGGESTED_TRACKS_FETCHED"
	MtvRoomTracksListScoreUpdate                  brainy.EventType = "TRACKS_LIST_SCORE_UPDATE"
	MtvRoomUpdateDelegationOwner                  brainy.EventType = "UPDATE_DELEGATION_OWNER"
	MtvRoomControlAndDelegationPermission         brainy.EventType = "UPDATE_CONTROL_AND_DELEGATION_PERMISSION"
)

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

func MtvRoomWorkflow(ctx workflow.Context, params shared.MtvRoomParameters) error {
	var (
		err           error
		internalState MtvRoomInternalState
	)

	logger := workflow.GetLogger(ctx)

	if !params.PlayingMode.IsValid() {
		logger.Info("Workflow creation failed, playingMode is invalid", "Error", err)
		return errors.New("workflow creation failed, playingMode is invalid")
	}
	internalState.FillWith(params)

	if err := workflow.SetQueryHandler(
		ctx,
		shared.MtvGetStateQuery,
		func(userID string) (shared.MtvRoomExposedState, error) {
			// Here we do not use workflow.sideEffect for at least two reasons:
			// 1- we cannot use workflow.sideEffect in the getState queryHandler
			// 2- we never update our internalState depending on internalState.Export() results
			// this data aims to be sent to adonis.
			exposedState := internalState.Export(userID)

			return exposedState, nil
		},
	); err != nil {
		logger.Info("SetQueryHandler failed.", "Error", err)
		return err
	}

	if err := workflow.SetQueryHandler(
		ctx,
		shared.MtvGetUsersListQuery,
		func() ([]shared.ExposedInternalStateUserListElement, error) {

			usersList := make([]shared.ExposedInternalStateUserListElement, 0, len(internalState.Users))

			for _, user := range internalState.Users {

				isCreator := internalState.initialParams.RoomCreatorUserID == user.UserID
				isDelegationOwner := internalState.DelegationOwnerUserID != nil && *internalState.DelegationOwnerUserID == user.UserID

				formatedUserListElement := shared.ExposedInternalStateUserListElement{
					UserID:                            user.UserID,
					HasControlAndDelegationPermission: user.HasControlAndDelegationPermission,
					IsCreator:                         isCreator,
					IsDelegationOwner:                 isDelegationOwner,
				}
				usersList = append(usersList, formatedUserListElement)
			}

			return usersList, nil
		},
	); err != nil {
		logger.Info("SetQueryHandler for getUsersList failed.", "Error", err)
		return err
	}

	channel := workflow.GetSignalChannel(ctx, shared.SignalChannelName)

	var (
		terminated                               = false
		workflowFatalError                       error
		timerExpirationFuture                    workflow.Future
		fetchedInitialTracksFuture               workflow.Future
		fetchedSuggestedTracksInformationFutures []workflow.Future
		voteIntervalTimerFuture                  workflow.Future
	)

	internalState.Machine, err = brainy.NewMachine(brainy.StateNode{
		Initial: MtvRoomFetchInitialTracks,

		States: brainy.StateNodes{
			MtvRoomFetchInitialTracks: &brainy.StateNode{
				OnEntry: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							fetchedInitialTracksFuture = sendFetchTracksInformationActivity(ctx, internalState.initialParams.InitialTracksIDsList)

							return nil
						},
					),
				},

				On: brainy.Events{
					MtvRoomInitialTracksFetched: brainy.Transition{
						Target: MtvRoomPausedState,

						Actions: brainy.Actions{
							brainy.ActionFn(
								assignInitialFetchedTracks(&internalState),
							),
							brainy.ActionFn(
								func(c brainy.Context, e brainy.Event) error {
									if err := acknowledgeRoomCreation(
										ctx,
										internalState.Export(internalState.initialParams.RoomCreatorUserID),
									); err != nil {
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
							exposedInternalState := internalState.Export(shared.NoRelatedUserID)
							sendPauseActivity(ctx, exposedInternalState)

							return nil
						},
					),
				},

				On: brainy.Events{
					MtvRoomPlay: brainy.Transition{
						Target: MtvRoomPlayingState,

						Cond: checkUserPermissionAndCanPlayCurrentTrack(&internalState),
					},

					MtvRoomTracksListScoreUpdate: brainy.Transition{
						Target: MtvRoomPlayingState,

						Cond: currentTrackEndedAndNextTrackIsReadyToBePlayed(&internalState),

						Actions: brainy.Actions{
							brainy.ActionFn(
								assignNextTrack(&internalState),
							),
						},
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
									// To do not corrupt the elapsed on a paused room with the freshly created timer
									// but also set as playing true a previously paused room after a go to next track event
									// we need to mutate and update the internalState after the internalState.Export()
									exposedInternalState := internalState.Export(shared.NoRelatedUserID)
									exposedInternalState.Playing = true
									internalState.Playing = true

									sendPlayActivity(ctx, exposedInternalState)

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
										nextTrackIsReadyToBePlayed := internalState.Tracks.FirstTrackIsReadyToBePlayed(internalState.initialParams.MinimumScoreToBePlayed)
										nextTrackIsNotReadyToBePlayed := !nextTrackIsReadyToBePlayed

										return currentTrackEnded && nextTrackIsNotReadyToBePlayed
									},

									Target: MtvRoomPlayingTimeoutExpiredState,

									Actions: brainy.Actions{
										brainy.ActionFn(
											func(c brainy.Context, e brainy.Event) error {
												fmt.Println("__NO MORE TRACKS TO PLAY__")
												event := e.(MtvRoomTimerExpirationEvent)

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
										nextTrackIsReadyToBePlayed := internalState.Tracks.FirstTrackIsReadyToBePlayed(internalState.initialParams.MinimumScoreToBePlayed)

										if currentTrackEnded {
											fmt.Println("__TRACK IS FINISHED GOING TO THE NEXT ONE__")
										}

										return currentTrackEnded && nextTrackIsReadyToBePlayed
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
												internalState.CurrentTrack.AlreadyElapsed += elapsed

												return nil
											},
										),
									},
								},
							},

							MtvRoomPause: brainy.Transition{
								Cond: userHasPermissionToPauseCurrentTrack(&internalState),

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

							sendChangeUserEmittingDeviceActivity(ctx, internalState.Export(event.UserID))
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

							joinActivityArgs := activities.MtvJoinCallbackRequestBody{
								State:         internalState.Export(event.User.UserID),
								JoiningUserID: event.User.UserID,
							}
							sendJoinActivity(ctx, joinActivityArgs)
							sendUserLengthUpdateActivity(ctx, internalState.Export(shared.NoRelatedUserID))
							return nil
						},
					),
				},
			},

			MtvRoomVoteForTrackEvent: brainy.Transition{
				Actions: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							event := e.(MtvRoomUserVoteForTrackEvent)

							success := internalState.UserVoteForTrack(event.UserID, event.TrackID)
							if success {

								if voteIntervalTimerFuture == nil {
									voteIntervalTimerFuture = workflow.NewTimer(ctx, shared.CheckForVoteUpdateIntervalDuration)
								}

								sendUserVoteForTrackAcknowledgementActivity(ctx, internalState.Export(event.UserID))
							}

							return nil
						},
					),
					brainy.Send(
						MtvRoomTracksListScoreUpdate,
					),
				},
			},

			MtvCheckForScoreUpdateIntervalExpirationEvent: brainy.Transition{
				Actions: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							tracksListsAreEqual := internalState.Tracks.DeepEqual(internalState.TracksCheckForVoteUpdateLastSave)
							currentTrackAreEqual := internalState.CurrentTrack.DeepEqual(internalState.CurrentTrackCheckForVoteUpdateLastSave)
							needToNotifySuggestOrVoteUpdateActivity := !(tracksListsAreEqual && currentTrackAreEqual)

							if needToNotifySuggestOrVoteUpdateActivity {
								sendNotifySuggestOrVoteUpdateActivity(ctx, internalState.Export(shared.NoRelatedUserID))

								internalState.TracksCheckForVoteUpdateLastSave = internalState.Tracks
								internalState.CurrentTrackCheckForVoteUpdateLastSave = internalState.CurrentTrack
								voteIntervalTimerFuture = workflow.NewTimer(ctx, shared.CheckForVoteUpdateIntervalDuration)
							} else {
								voteIntervalTimerFuture = nil
								internalState.TracksCheckForVoteUpdateLastSave = shared.TracksMetadataWithScoreSet{}
								internalState.CurrentTrackCheckForVoteUpdateLastSave = shared.CurrentTrack{}
							}

							return nil
						},
					),
				},
			},

			MtvRoomUpdateUserFitsPositionConstraint: brainy.Transition{
				Cond: roomHasPositionAndTimeConstraint(&internalState),

				Actions: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							event := e.(MtvRoomUpdateUserFitsPositionConstraintEvent)

							success := internalState.UpdateUserFitsPositionConstraint(event.UserID, event.UserFitsPositionConstraint)

							if success {
								sendAcknowledgeUpdateUserFitsPositionConstraintActivity(ctx, internalState.Export(event.UserID))
							}

							return nil
						},
					),
				},
			},

			MtvRoomUpdateDelegationOwner: brainy.Transition{
				Cond: roomPlayingModeIsDirectAndUserExistsAndEmitterHasPermissions(&internalState),

				Actions: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							event := e.(MtvRoomUpdateDelegationOwnerEvent)

							internalState.DelegationOwnerUserID = &event.NewDelegationOwnerUserID
							sendAcknowledgeUpdateDelegationOwnerActivity(ctx, internalState.Export(shared.NoRelatedUserID))

							return nil
						},
					),
				},
			},

			MtvRoomControlAndDelegationPermission: brainy.Transition{
				Cond: userToUpdateExists(&internalState),

				Actions: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							event := e.(MtvRoomUpdateControlAndDelegationPermissionEvent)

							userToUpdate := internalState.GetUserRelatedInformation(event.ToUpdateUserID)

							userToUpdate.HasControlAndDelegationPermission = event.HasControlAndDelegationPermission

							sendAcknowledgeUpdateControlAndDelegationPermissionActivity(
								ctx,
								internalState.Export(event.ToUpdateUserID),
							)

							return nil
						},
					),
				},
			},

			MtvRoomRemoveUserEvent: brainy.Transition{
				Actions: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							event := e.(MtvRoomUserLeavingRoomEvent)

							success := internalState.RemoveUser(event.UserID)

							if success {
								roomIsInDirectMode := internalState.initialParams.PlayingMode == shared.MtvPlayingModeDirect
								delegationOwnerIsLeavingRoom := internalState.DelegationOwnerUserID != nil && *internalState.DelegationOwnerUserID == event.UserID
								if delegationOwnerIsLeavingRoom && roomIsInDirectMode {
									internalState.DelegationOwnerUserID = &(internalState.initialParams.RoomCreatorUserID)
								}

								joinActivityArgs := activities.AcknowledgeLeaveRoomRequestBody{
									LeavingUserID: event.UserID,
									State:         internalState.Export(shared.NoRelatedUserID),
								}
								sendLeaveActivity(ctx, joinActivityArgs)
								sendUserLengthUpdateActivity(ctx, internalState.Export(shared.NoRelatedUserID))
							}

							return nil
						},
					),
				},
			},

			MtvRoomGoToNextTrack: brainy.Transition{
				Target: MtvRoomPlayingState,

				Cond: userHasPermissionAndHasNextTrackToPlay(&internalState),

				Actions: brainy.Actions{
					brainy.ActionFn(
						assignNextTrack(&internalState),
					),
				},
			},

			MtvRoomSuggestTracks: brainy.Transition{
				Actions: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							event := e.(MtvRoomSuggestTracksEvent)

							acceptedSuggestedTracksIDs := make([]string, 0, len(event.TracksToSuggest))
							succesfullSuggestIntoVoteTracksIDs := make([]string, 0, len(event.TracksToSuggest))
							for _, suggestedTrackID := range event.TracksToSuggest {

								//Checking if the suggested track is in the player
								isCurrentTrack := internalState.CurrentTrack.ID == suggestedTrackID
								if isCurrentTrack {
									continue
								}

								//Checking if the suggested track is in the queue
								isDuplicate := internalState.Tracks.Has(suggestedTrackID)
								if isDuplicate {
									//Count as a voted for suggested track if already is list
									success := internalState.UserVoteForTrack(event.UserID, suggestedTrackID)
									if success {
										succesfullSuggestIntoVoteTracksIDs = append(succesfullSuggestIntoVoteTracksIDs, suggestedTrackID)

										if voteIntervalTimerFuture == nil {
											voteIntervalTimerFuture = workflow.NewTimer(ctx, shared.CheckForVoteUpdateIntervalDuration)
										}
									}
									continue
								}

								acceptedSuggestedTracksIDs = append(acceptedSuggestedTracksIDs, suggestedTrackID)
							}

							hasNoTracksToFetch := len(acceptedSuggestedTracksIDs) == 0
							hasNoSuccessfullVoteForDuplicate := len(succesfullSuggestIntoVoteTracksIDs) == 0

							if hasNoTracksToFetch {
								if hasNoSuccessfullVoteForDuplicate {
									sendAcknowledgeTracksSuggestionFailActivity(ctx, activities.AcknowledgeTracksSuggestionFailArgs{
										DeviceID: event.DeviceID,
									})

								} else {
									sendAcknowledgeTracksSuggestionActivity(ctx, activities.AcknowledgeTracksSuggestionArgs{
										DeviceID: event.DeviceID,
										State:    internalState.Export(event.UserID),
									})
								}
								return nil
							}

							fetchingFuture := sendFetchTracksInformationActivityAndForwardInitiator(ctx, acceptedSuggestedTracksIDs, event.UserID, event.DeviceID)

							fetchedSuggestedTracksInformationFutures = append(fetchedSuggestedTracksInformationFutures, fetchingFuture)

							return nil
						},
					),
					brainy.Send(
						MtvRoomTracksListScoreUpdate,
					),
				},
			},

			MtvRoomSuggestedTracksFetched: brainy.Transition{
				Actions: brainy.Actions{
					brainy.ActionFn(
						func(c brainy.Context, e brainy.Event) error {
							event := e.(MtvRoomSuggestedTracksFetchedEvent)

							for _, trackInformation := range event.SuggestedTracksInformation {
								suggestedTrackInformation := shared.TrackMetadataWithScore{
									TrackMetadata: trackInformation,

									Score: 0,
								}

								internalState.Tracks.Add(suggestedTrackInformation)
								success := internalState.UserVoteForTrack(event.UserID, trackInformation.ID)
								if success && voteIntervalTimerFuture == nil {
									voteIntervalTimerFuture = workflow.NewTimer(ctx, shared.CheckForVoteUpdateIntervalDuration)
								}
							}

							sendAcknowledgeTracksSuggestionActivity(ctx, activities.AcknowledgeTracksSuggestionArgs{
								DeviceID: event.DeviceID,
								State:    internalState.Export(event.UserID),
							})

							return nil
						},
					),
					brainy.Send(
						MtvRoomTracksListScoreUpdate,
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
				if err := validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}

				args := NewMtvRoomPlayEventArgs{
					UserID: message.UserID,
				}
				internalState.Machine.Send(NewMtvRoomPlayEvent(args))

			case shared.SignalRoutePause:
				var message shared.PauseSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
				if err := validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}

				args := NewMtvRoomPauseEventArgs{
					UserID: message.UserID,
				}
				internalState.Machine.Send(NewMtvRoomPauseEvent(args))

			case shared.SignalRouteJoin:
				var message shared.JoinSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
				if err := validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}

				user := shared.InternalStateUser{
					UserID:                            message.UserID,
					DeviceID:                          message.DeviceID,
					TracksVotedFor:                    make([]string, 0),
					UserFitsPositionConstraint:        nil,
					HasControlAndDelegationPermission: false,
					UserHasBeenInvited:                message.UserHasBeenInvited,
				}

				if internalState.initialParams.HasPhysicalAndTimeConstraints {
					tmp := false
					user.UserFitsPositionConstraint = &tmp
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
				if err := validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}
				args := NewMtvRoomGoToNextTrackEventArgs{
					UserID: message.UserID,
				}
				internalState.Machine.Send(NewMtvRoomGoToNextTrackEvent(args))

			case shared.SignalRouteChangeUserEmittingDevice:
				var message shared.ChangeUserEmittingDeviceSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
				if err := validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}

				internalState.Machine.Send(
					NewMtvRoomChangeUserEmittingDeviceEvent(message.UserID, message.DeviceID),
				)

			case shared.SignalRouteSuggestTracks:
				var message shared.SuggestTracksSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
				if err := validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}

				internalState.Machine.Send(
					NewMtvRoomSuggestTracksEvent(NewMtvRoomSuggestTracksEventArgs{
						TracksToSuggest: message.TracksToSuggest,
						UserID:          message.UserID,
						DeviceID:        message.DeviceID,
					}),
				)

			case shared.SignalRouteLeave:
				var message shared.LeaveSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
				if err := validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}

				internalState.Machine.Send(
					NewMtvRoomUserLeavingRoomEvent(message.UserID),
				)

			case shared.SignalRouteVoteForTrack:
				var message shared.VoteForTrackSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
				if err := validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}

				internalState.Machine.Send(
					NewMtvRoomUserVoteForTrackEvent(message.UserID, message.TrackID),
				)

			case shared.SignalUpdateUserFitsPositionConstraint:
				var message shared.UpdateUserFitsPositionConstraintSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
				if err := validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}

				internalState.Machine.Send(
					NewMtvRoomUpdateUserFitsPositionConstraintEvent(message.UserID, message.UserFitsPositionConstraint),
				)

			case shared.SignalUpdateDelegationOwner:
				var message shared.UpdateDelegationOwnerSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
				if err := validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}

				internalState.Machine.Send(
					NewMtvRoomUpdateDelegationOwnerEvent(message.NewDelegationOwnerUserID, message.EmitterUserID),
				)

			case shared.SignalUpdateControlAndDelegationPermission:
				var message shared.UpdateControlAndDelegationPermissionSignal

				if err := mapstructure.Decode(signal, &message); err != nil {
					logger.Error("Invalid signal type %v", err)
					return
				}
				if err := validate.Struct(message); err != nil {
					logger.Error("Validation error: %v", err)
					return
				}

				internalState.Machine.Send(
					NewMtvRoomUpdateControlAndDelegationPermissionEvent(NewMtvRoomUpdateControlAndDelegationPermissionEventArgs{
						ToUpdateUserID:                    message.ToUpdateUserID,
						HasControlAndDelegationPermission: message.HasControlAndDelegationPermission,
					}),
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

		if voteIntervalTimerFuture != nil {
			selector.AddFuture(voteIntervalTimerFuture, func(f workflow.Future) {
				internalState.Machine.Send(NewMtvRoomCheckForScoreUpdateIntervalExpirationEvent())
			})
		}

		for index, fetchedSuggestedTracksInformationFuture := range fetchedSuggestedTracksInformationFutures {
			selector.AddFuture(fetchedSuggestedTracksInformationFuture, func(f workflow.Future) {
				fetchedSuggestedTracksInformationFutures = removeFutureFromSlice(fetchedSuggestedTracksInformationFutures, index)

				var suggestedTracksInformationActivityResult activities.FetchedTracksInformationWithInitiator

				if err := f.Get(ctx, &suggestedTracksInformationActivityResult); err != nil {
					logger.Error("error occured initialTracksActivityResult", err)

					return
				}

				internalState.Machine.Send(
					NewMtvRoomSuggestedTracksFetchedEvent(NewMtvRoomSuggestedTracksFetchedEventArgs{
						SuggestedTracksInformation: suggestedTracksInformationActivityResult.Metadata,
						UserID:                     suggestedTracksInformationActivityResult.UserID,
						DeviceID:                   suggestedTracksInformationActivityResult.DeviceID,
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

func removeFutureFromSlice(slice []workflow.Future, index int) []workflow.Future {
	slice[index] = slice[len(slice)-1]
	return slice[:len(slice)-1]
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

var TimeWrapper TimeWrapperType = time.Now
