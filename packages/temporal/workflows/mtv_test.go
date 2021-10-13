package workflows

import (
	"fmt"
	"testing"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	"github.com/AdonisEnProvence/MusicRoom/random"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/AdonisEnProvence/MusicRoom/workflows/mocks"

	"github.com/bxcodec/faker/v3"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
	"go.temporal.io/sdk/testsuite"
	"go.temporal.io/sdk/workflow"
)

type UnitTestSuite struct {
	suite.Suite
	testsuite.WorkflowTestSuite

	env *testsuite.TestWorkflowEnvironment
}

func (s *UnitTestSuite) SetupTest() {
	s.env = s.NewTestWorkflowEnvironment()
}

func (s *UnitTestSuite) AfterTest(suiteName, testName string) {
	s.env.AssertExpectations(s.T())
}

func (s *UnitTestSuite) getMtvState(userID string) shared.MtvRoomExposedState {
	var mtvState shared.MtvRoomExposedState

	res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery, userID)
	s.NoError(err)

	err = res.Get(&mtvState)
	s.NoError(err)

	return mtvState
}

func (s *UnitTestSuite) getUsersList() []shared.ExposedInternalStateUserListElement {
	var usersList []shared.ExposedInternalStateUserListElement

	res, err := s.env.QueryWorkflow(shared.MtvGetUsersListQuery)
	s.NoError(err)

	err = res.Get(&usersList)
	s.NoError(err)

	return usersList
}

func (s *UnitTestSuite) emitPlaySignal(args shared.NewPlaySignalArgs) {
	fmt.Println("-----EMIT PLAY CALLED IN TEST-----")
	playSignal := shared.NewPlaySignal(args)
	s.env.SignalWorkflow(shared.SignalChannelName, playSignal)
}

func (s *UnitTestSuite) emitUpdateUserPositionPermissionSignal(args shared.NewUpdateUserFitsPositionConstraintSignalArgs) {
	fmt.Println("-----EMIT UPDATE POSITION CALLED IN TEST-----")
	updatePositionSignal := shared.NewUpdateUserFitsPositionConstraintSignal(args)
	s.env.SignalWorkflow(shared.SignalChannelName, updatePositionSignal)
}

func (s *UnitTestSuite) emitUpdateDelegationOwnerSignal(args shared.NewUpdateDelegationOwnerSignalArgs) {
	fmt.Println("-----EMIT UPDATE DELEGATION OWNER CALLED IN TEST-----")
	updateDelegationOwnerSignal := shared.NewUpdateDelegationOwnerSignal(args)
	s.env.SignalWorkflow(shared.SignalChannelName, updateDelegationOwnerSignal)
}

func (s *UnitTestSuite) emitUpdateControlAndDelegationPermissionSignal(args shared.NewUpdateControlAndDelegationPermissionSignalArgs) {
	fmt.Println("-----EMIT UPDATE CONTROL AND DELEGATION PERMISSION CALLED IN TEST-----")
	updateDelegationOwnerSignal := shared.NewUpdateControlAndDelegationPermissionSignal(args)
	s.env.SignalWorkflow(shared.SignalChannelName, updateDelegationOwnerSignal)
}

func (s *UnitTestSuite) emitSuggestTrackSignal(args shared.SuggestTracksSignalArgs) {
	fmt.Println("-----EMIT SUGGEST TRACK CALLED IN TEST-----")
	suggestTracksSignal := shared.NewSuggestTracksSignal(args)

	s.env.SignalWorkflow(shared.SignalChannelName, suggestTracksSignal)
}

func (s *UnitTestSuite) emitVoteSignal(args shared.NewVoteForTrackSignalArgs) {
	fmt.Println("-----EMIT VOTE TRACK CALLED IN TEST-----")
	voteForTrackSignal := shared.NewVoteForTrackSignal(args)

	s.env.SignalWorkflow(shared.SignalChannelName, voteForTrackSignal)
}

func (s *UnitTestSuite) emitJoinSignal(args shared.NewJoinSignalArgs) {
	fmt.Println("-----EMIT JOIN CALLED IN TEST-----")
	signal := shared.NewJoinSignal(shared.NewJoinSignalArgs{
		UserID:             args.UserID,
		DeviceID:           args.DeviceID,
		UserHasBeenInvited: args.UserHasBeenInvited,
	})

	s.env.SignalWorkflow(shared.SignalChannelName, signal)
}

func (s *UnitTestSuite) emitLeaveSignal(userID string) {
	fmt.Println("-----EMIT LEAVE CALLED IN TEST-----")
	signal := shared.NewLeaveSignal(shared.NewLeaveSignalArgs{
		UserID: userID,
	})

	s.env.SignalWorkflow(shared.SignalChannelName, signal)
}

func (s *UnitTestSuite) emitChangeUserEmittingDevice(userID string, deviceID string) {
	fmt.Println("-----EMIT CHANGE USER EMITTING DEVICE CALLED IN TEST-----")
	signal := shared.NewChangeUserEmittingDeviceSignal(shared.ChangeUserEmittingDeviceSignalArgs{
		UserID:   userID,
		DeviceID: deviceID,
	})

	s.env.SignalWorkflow(shared.SignalChannelName, signal)
}

func (s *UnitTestSuite) mockOnceSuggest(userID string, deviceID string, roomID string, tracks []shared.TrackMetadata) {
	s.env.OnActivity(
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		mock.Anything,
		userID,
		deviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: tracks,
		UserID:   userID,
		DeviceID: deviceID,
	}, nil).Once()

	s.env.OnActivity(
		activities.AcknowledgeTracksSuggestion,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
}

func (s *UnitTestSuite) emitPauseSignal(args shared.NewPauseSignalArgs) {
	fmt.Println("-----EMIT PAUSED CALLED IN TEST-----")
	pauseSignal := shared.NewPauseSignal(args)

	s.env.SignalWorkflow(shared.SignalChannelName, pauseSignal)
}

func (s *UnitTestSuite) emitGoToNextTrackSignal(args shared.NewGoToNextTrackSignalArgs) {
	fmt.Println("-----EMIT GO TO NEXT TRACK IN TEST-----")
	goToNextTrackSignal := shared.NewGoToNexTrackSignal(args)

	s.env.SignalWorkflow(shared.SignalChannelName, goToNextTrackSignal)
}

func (s *UnitTestSuite) initTestEnv() (func(), func(callback func(), durationToAdd time.Duration)) {
	var temporalTemporality time.Duration
	now := time.Now()
	oldImplem := TimeWrapper
	timeMock := new(mocks.TimeWrapperType)
	timeMockExecute := timeMock.On("Execute")
	timeMockExecute.Return(now)
	TimeWrapper = timeMock.Execute

	addToNextTimeNowMock := func(toAdd time.Duration) time.Time {
		now = now.Add(toAdd)
		timeMockExecute.Return(now)

		fmt.Println(">>>>>>>>>>>>>>>")
		fmt.Printf("Now update received = %+v\n", toAdd.Seconds())
		fmt.Printf("now = %+v\n", now)
		fmt.Println("<<<<<<<<<<<<<<<")
		return now
	}

	return func() {
			TimeWrapper = oldImplem
		}, func(callback func(), durationToAdd time.Duration) {
			temporalTemporality += durationToAdd
			s.env.RegisterDelayedCallback(func() {
				addToNextTimeNowMock(durationToAdd)
				callback()
			}, temporalTemporality)
		}
}

func getWokflowInitParams(tracksIDs []string, minimumScoreToBePlayed int) (shared.MtvRoomParameters, string) {
	var (
		workflowID          = faker.UUIDHyphenated()
		roomCreatorUserID   = faker.UUIDHyphenated()
		roomCreatorDeviceID = faker.UUIDHyphenated()
	)

	initialUsers := make(map[string]*shared.InternalStateUser)
	initialUsers[roomCreatorUserID] = &shared.InternalStateUser{
		UserID:                            roomCreatorUserID,
		DeviceID:                          roomCreatorDeviceID,
		TracksVotedFor:                    make([]string, 0),
		HasControlAndDelegationPermission: true,
	}

	return shared.MtvRoomParameters{
		RoomID:                        workflowID,
		RoomCreatorUserID:             roomCreatorUserID,
		RoomName:                      faker.Word(),
		InitialUsers:                  initialUsers,
		InitialTracksIDsList:          tracksIDs,
		MinimumScoreToBePlayed:        minimumScoreToBePlayed,
		HasPhysicalAndTimeConstraints: false,
		PhysicalAndTimeConstraints:    nil,
		IsOpen:                        true,
		IsOpenOnlyInvitedUsersCanVote: false,
		PlayingMode:                   shared.MtvPlayingModeBroadcast,
	}, roomCreatorDeviceID
}

// Test_PlayThenPauseTrack scenario:
// TODO redict the scenario
func (s *UnitTestSuite) Test_PlayThenPauseTrack() {
	firstTrackDuration := random.GenerateRandomDuration()
	firstTrackDurationFirstThird := firstTrackDuration / 3
	secondTrackDuration := random.GenerateRandomDuration()
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	defaultDuration := 1 * time.Millisecond

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   firstTrackDuration,
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   secondTrackDuration,
		},
	}
	tracksIDs := []string{tracks[0].ID, tracks[1].ID}
	params, _ := getWokflowInitParams(tracksIDs, 1)

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(3)
	s.env.OnActivity(
		activities.PauseActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(3)

	checkThatRoomIsNotPlaying := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)
		s.False(mtvState.Playing)

		s.emitPlaySignal(shared.NewPlaySignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, checkThatRoomIsNotPlaying)

	emitPause := firstTrackDurationFirstThird
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)
		s.True(mtvState.Playing)
		s.emitPauseSignal(shared.NewPauseSignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, emitPause)

	checkThatOneThirdFirstTrackElapsed := defaultDuration
	registerDelayedCallbackWrapper(func() {
		fmt.Println("*********VERIFICATION FIRST THIRD TIER ELAPSED*********")
		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[0].ID,
						ArtistName: tracks[0].ArtistName,
						Title:      tracks[0].Title,
						Duration:   0,
					},

					Score: 1,
				},
				AlreadyElapsed: 0,
			},
			Duration: firstTrackDuration.Milliseconds(),
			Elapsed:  firstTrackDurationFirstThird.Milliseconds(),
		}
		mtvState := s.getMtvState(shared.NoRelatedUserID)
		fmt.Printf("We should find the first third elapsed for the first track\n%+v\n", mtvState.CurrentTrack)

		s.False(mtvState.Playing)
		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)

	}, checkThatOneThirdFirstTrackElapsed)

	secondEmitPlaySignal := defaultDuration
	//Play alone because the signal is sent as last from registerDelayedCallback
	registerDelayedCallbackWrapper(func() {
		fmt.Println("*********VERIFICATION 3/3 first track*********")
		s.emitPlaySignal(shared.NewPlaySignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, secondEmitPlaySignal)

	// Important
	// Here we want to update the timeMock before the new timer for the second track
	// Then between this step and the next one the elapsed will incr by defaultDuration
	updateTimeMockForTimerExpiration := firstTrackDurationFirstThird + firstTrackDurationFirstThird
	registerDelayedCallbackWrapper(func() {
	}, updateTimeMockForTimerExpiration)

	sixth := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)
		fmt.Printf("We should find the second track with an elapsed at 0\n%+v\n", mtvState.CurrentTrack)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						ArtistName: tracks[1].ArtistName,
						Title:      tracks[1].Title,
						Duration:   0,
					},

					Score: 1,
				},
				AlreadyElapsed: 0,
			},
			Duration: secondTrackDuration.Milliseconds(),
			Elapsed:  1, //Why 1 ? see comment above
		}

		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, sixth)

	checkThatSecondTrackHalfTotalDurationElapsed := secondTrackDuration/2 - defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)
		fmt.Printf("We should find the second track with an elapsed at half second track total duration\n%+v\n", mtvState.CurrentTrack)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						ArtistName: tracks[1].ArtistName,
						Title:      tracks[1].Title,
						Duration:   0,
					},

					Score: 1,
				},
				AlreadyElapsed: 0,
			},
			Duration: secondTrackDuration.Milliseconds(),
			Elapsed:  (secondTrackDuration / 2).Milliseconds(),
		}

		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, checkThatSecondTrackHalfTotalDurationElapsed)

	//Temporal triggers his workflow.newTimer depending on the temporalTemporality

	// Remark: when temporal fires the secondTrackDuration timer the timeMock wasn't sync with
	// the temporal temporality. It still works because when a timer ends with increment the
	// alreadyElapsed with the timer total duration
	// If not we should have put a registerDelayedCallback just at secondTrackDuration to update
	// time mock return value
	verifyStateMachineIsFreezed := secondTrackDuration/2 + defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)
		expectedElapsed := secondTrackDuration.Milliseconds()
		s.Equal(expectedElapsed, mtvState.CurrentTrack.Elapsed)
	}, verifyStateMachineIsFreezed)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

// Test_JoinCreatedRoom scenario:
//
// 1. There is initially one user in the room.
//
// 2. We signal the workflow that another user wants
// to join the room.
//
// 3. We expect the workflow to return that there are
// now two users.
func (s *UnitTestSuite) Test_JoinCreatedRoom() {
	var (
		fakeUserID   = faker.UUIDHyphenated()
		fakeDeviceID = faker.UUIDHyphenated()
	)

	firstTrackDuration := random.GenerateRandomDuration()

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   firstTrackDuration,
		},
	}
	tracksIDs := []string{tracks[0].ID}
	params, _ := getWokflowInitParams(tracksIDs, 1)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.JoinActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)
	s.env.OnActivity(
		activities.UserLengthUpdateActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)

	checkOnlyOneUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.Empty(mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(1, mtvState.UsersLength)
	}, checkOnlyOneUser)

	secondUserJoins := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           fakeDeviceID,
			UserID:             fakeUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, secondUserJoins)

	shouldNotBeRegisterDeviceID := faker.UUIDHyphenated()
	tryDuplicateOrOverrrideTheUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           shouldNotBeRegisterDeviceID,
			UserID:             fakeUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, tryDuplicateOrOverrrideTheUser)

	emptyDeviceID := defaultDuration
	randomUserID := faker.UUIDHyphenated()
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           "",
			UserID:             randomUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emptyDeviceID)

	checkForEmptyDeviceIDInfo := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(randomUserID)

		s.Equal(2, mtvState.UsersLength)
		s.Empty(mtvState.UserRelatedInformation)
	}, checkForEmptyDeviceIDInfo)

	emptyUserID := defaultDuration
	randomDeviceID := faker.UUIDHyphenated()
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           randomDeviceID,
			UserID:             "",
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emptyUserID)

	checkForEmptyUserIDInfo := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.Equal(2, mtvState.UsersLength)
		s.Empty(mtvState.UserRelatedInformation)
	}, checkForEmptyUserIDInfo)

	checkTwoUsersThenEmitPlay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(fakeUserID)

		s.Equal(2, mtvState.UsersLength)
		expectedInternalStateUser := &shared.InternalStateUser{
			UserID:                            fakeUserID,
			DeviceID:                          fakeDeviceID,
			TracksVotedFor:                    make([]string, 0),
			HasControlAndDelegationPermission: false,
		}

		s.NotEqual(shouldNotBeRegisterDeviceID, mtvState.UserRelatedInformation.DeviceID)
		s.Equal(expectedInternalStateUser, mtvState.UserRelatedInformation)
		s.emitPlaySignal(shared.NewPlaySignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, checkTwoUsersThenEmitPlay)

	emitPauseSignal := firstTrackDuration - 200*defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[0].ID,
						ArtistName: tracks[0].ArtistName,
						Title:      tracks[0].Title,
						Duration:   0,
					},

					Score: 1,
				},

				AlreadyElapsed: 0,
			},
			Duration: firstTrackDuration.Milliseconds(),
			Elapsed:  (firstTrackDuration - 200*defaultDuration).Milliseconds(),
		}

		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, emitPauseSignal)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_ChangeUserEmittingDevice() {
	var (
		fakeUserID   = faker.UUIDHyphenated()
		fakeDeviceID = faker.UUIDHyphenated()
	)

	firstTrackDuration := random.GenerateRandomDuration()

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   firstTrackDuration,
		},
	}
	tracksIDs := []string{tracks[0].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 2)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.ChangeUserEmittingDeviceActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.JoinActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	checkCreateUserRelatedInformation := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedInternalStateUser := &shared.InternalStateUser{
			UserID:   params.RoomCreatorUserID,
			DeviceID: creatorDeviceID,
			TracksVotedFor: []string{
				tracks[0].ID,
			},
			HasControlAndDelegationPermission: true,
		}

		s.Equal(1, mtvState.UsersLength)
		s.Equal(2, mtvState.MinimumScoreToBePlayed)
		s.False(mtvState.Playing)
		s.Equal(expectedInternalStateUser, mtvState.UserRelatedInformation)
	}, checkCreateUserRelatedInformation)

	checkUnkownUserIDUserRelatedInformation := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(faker.UUIDHyphenated())

		s.Equal(1, mtvState.UsersLength)
		s.False(mtvState.Playing)
		s.Empty(mtvState.UserRelatedInformation)
	}, checkUnkownUserIDUserRelatedInformation)

	checkEmptyUserIDRelatedInformation := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.Equal(1, mtvState.UsersLength)
		s.False(mtvState.Playing)
		s.Empty(mtvState.UserRelatedInformation)
	}, checkEmptyUserIDRelatedInformation)

	emitJoin := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           fakeDeviceID,
			UserID:             fakeUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoin)

	checkLatestUserRelatedInformation := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(fakeUserID)

		expectedInternalStateUser := &shared.InternalStateUser{
			UserID:                            fakeUserID,
			DeviceID:                          fakeDeviceID,
			TracksVotedFor:                    make([]string, 0),
			HasControlAndDelegationPermission: false,
		}

		s.Equal(2, mtvState.UsersLength)
		s.False(mtvState.Playing)
		s.Equal(expectedInternalStateUser, mtvState.UserRelatedInformation)
	}, checkLatestUserRelatedInformation)

	secondCreatorDeviceID := faker.UUIDHyphenated()
	changeCreatorDeviceID := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitChangeUserEmittingDevice(params.RoomCreatorUserID, secondCreatorDeviceID)
	}, changeCreatorDeviceID)

	changeDeviceIDWithEmptyString := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitChangeUserEmittingDevice(params.RoomCreatorUserID, "")
	}, changeDeviceIDWithEmptyString)

	checkThatCreatorDeviceIDChanged := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedInternalStateUser := &shared.InternalStateUser{
			UserID:   params.RoomCreatorUserID,
			DeviceID: secondCreatorDeviceID,
			TracksVotedFor: []string{
				tracks[0].ID,
			},
			HasControlAndDelegationPermission: true,
		}

		s.Equal(2, mtvState.UsersLength)
		s.False(mtvState.Playing)
		s.Equal(expectedInternalStateUser, mtvState.UserRelatedInformation)
	}, checkThatCreatorDeviceIDChanged)

	verifyThatTheOtherUserDidntChange := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(fakeUserID)

		expectedInternalStateUser := &shared.InternalStateUser{
			UserID:                            fakeUserID,
			DeviceID:                          fakeDeviceID,
			TracksVotedFor:                    make([]string, 0),
			HasControlAndDelegationPermission: false,
		}

		s.Equal(2, mtvState.UsersLength)
		s.False(mtvState.Playing)
		s.Equal(expectedInternalStateUser, mtvState.UserRelatedInformation)
	}, verifyThatTheOtherUserDidntChange)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

// Test_GoToNextTrack scenario:
//
// 1. We set up a Mtv Room with 2 initial tracks.
// By default the room will be in paused state, waiting
// for someone to play it.
//
// 2. We send a GoToNextTrack signal.
//
// 3. We expect the second track to be the current track.
//
// 4. We send another GoToNextTrack signal.
//
// 5. We expect the second initial track to still be
// the current one.
func (s *UnitTestSuite) Test_GoToNextTrack() {
	var (
		defaultDuration = 1 * time.Millisecond
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID, tracks[1].ID}
	params, _ := getWokflowInitParams(tracksIDs, 1)

	// secondTrackDuration := tracks[1].Duration
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.PauseActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)

	// 1. We expect the room to be paused by default.
	initialStateQueryDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.False(mtvState.Playing)
	}, initialStateQueryDelay)

	// 2. Send the first GoToNextTrack signal.
	firstGoToNextTrackSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitGoToNextTrackSignal(shared.NewGoToNextTrackSignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, firstGoToNextTrackSignal)

	// 3. We expect the second initial track to be the current one
	// and the room to be playing.
	verifyThatGoNextTrackWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.True(mtvState.Playing)
		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						ArtistName: tracks[1].ArtistName,
						Title:      tracks[1].Title,
						Duration:   0,
					},

					Score: 1,
				},

				AlreadyElapsed: 0,
			},
			Duration: tracks[1].Duration.Milliseconds(),
			Elapsed:  1,
		}

		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, verifyThatGoNextTrackWorked)

	// 4. Send the second GoToNextTrack signal.
	secondGoToNextTrackSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitGoToNextTrackSignal(shared.NewGoToNextTrackSignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, secondGoToNextTrackSignal)

	// 5. We expect the second initial track to still be the current one playing one
	// after we tried to go to the next track.
	verifyThatGoToNextTrackDidntWork := defaultDuration * 200
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.True(mtvState.Playing)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						ArtistName: tracks[1].ArtistName,
						Title:      tracks[1].Title,
						Duration:   0,
					},

					Score: 1,
				},

				AlreadyElapsed: 0,
			},
			Duration: tracks[1].Duration.Milliseconds(),
			Elapsed:  (defaultDuration * 202).Milliseconds(),
		}

		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, verifyThatGoToNextTrackDidntWork)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_UserLeaveRoom() {
	var (
		defaultDuration = 1 * time.Millisecond
		joiningUserID   = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID, tracks[1].ID}
	params, _ := getWokflowInitParams(tracksIDs, 1)

	// secondTrackDuration := tracks[1].Duration
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		mock.Anything,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.UserLengthUpdateActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)
	s.env.OnActivity(
		activities.LeaveActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	// 1. We expect the room to be paused by default and contains one user (the creator).
	initialStateQueryDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.False(mtvState.Playing)
		s.Equal(1, mtvState.UsersLength)
	}, initialStateQueryDelay)

	// 2. We send a join signal for a user
	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           faker.UUIDHyphenated(),
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	// 3. check user joined
	checkUserJoined := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.Equal(2, mtvState.UsersLength)
	}, checkUserJoined)

	// 4. the creator leaves the room
	creatorLeavesRoom := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitLeaveSignal(params.RoomCreatorUserID)
	}, creatorLeavesRoom)

	// 5. check user length
	creatorLeavedTheRoom := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.Equal(1, mtvState.UsersLength)
	}, creatorLeavedTheRoom)

	// 6. unkown user emit leave
	unkwonUserEmitLeave := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitLeaveSignal(faker.UUIDHyphenated())
	}, unkwonUserEmitLeave)

	// 7. check it didn't work
	checkItDidntWork := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.Equal(1, mtvState.UsersLength)
	}, checkItDidntWork)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_PlayActivityIsNotCalledWhenTryingToPlayTheLastTrackThatEnded() {
	firstTrackDuration := random.GenerateRandomDuration()

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   firstTrackDuration,
		},
	}
	tracksIDs := []string{tracks[0].ID}
	params, _ := getWokflowInitParams(tracksIDs, 1)

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()
	defaultDuration := 1 * time.Millisecond

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(1)
	s.env.OnActivity(
		activities.PauseActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)

	initialStateQueryDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.False(mtvState.Playing)
		s.emitPlaySignal(shared.NewPlaySignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, initialStateQueryDelay)

	secondStateQueryAfterTotalTrackDuration := firstTrackDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[0].ID,
						ArtistName: tracks[0].ArtistName,
						Title:      tracks[0].Title,
						Duration:   0,
					},

					Score: 1,
				},

				AlreadyElapsed: 0,
			},
			Duration: firstTrackDuration.Milliseconds(),
			Elapsed:  firstTrackDuration.Milliseconds(),
		}

		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, secondStateQueryAfterTotalTrackDuration)

	secondPlaySignalDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitPlaySignal(shared.NewPlaySignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, secondPlaySignalDelay)

	thirdStateQueryAfterSecondPlaySignal := firstTrackDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[0].ID,
						ArtistName: tracks[0].ArtistName,
						Title:      tracks[0].Title,
						Duration:   0,
					},

					Score: 1,
				},

				AlreadyElapsed: 0,
			},
			Duration: firstTrackDuration.Milliseconds(),
			Elapsed:  firstTrackDuration.Milliseconds(),
		}

		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, thirdStateQueryAfterSecondPlaySignal)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_CanSuggestTracks() {
	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID, tracks[1].ID}
	tracksIDsToSuggest := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	suggesterUserID := faker.UUIDHyphenated()
	suggesterDeviceID := faker.UUIDHyphenated()
	tracksToSuggestMetadata := []shared.TrackMetadata{
		{
			ID:         tracksIDsToSuggest[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         tracksIDsToSuggest[1],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	// Mock first tracks information fetching
	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	// Mock suggested and accepted tracks information fetching
	s.env.OnActivity(
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		tracksIDsToSuggest,
		suggesterUserID,
		suggesterDeviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: tracksToSuggestMetadata,
		UserID:   suggesterUserID,
		DeviceID: suggesterDeviceID,
	}, nil).Once()

	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.NotifySuggestOrVoteUpdateActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.AcknowledgeTracksSuggestion,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)
	s.env.OnActivity(
		activities.AcknowledgeTracksSuggestionFail,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	params, _ := getWokflowInitParams(tracksIDs, 1)

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()
	defaultDuration := 1 * time.Millisecond

	defer resetMock()

	joinSuggesterUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           suggesterDeviceID,
			UserID:             suggesterUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, joinSuggesterUser)

	firstSuggestTracksSignalDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared.SuggestTracksSignalArgs{
			TracksToSuggest: tracksIDsToSuggest,
			UserID:          suggesterUserID,
			DeviceID:        suggesterDeviceID,
		})
	}, firstSuggestTracksSignalDelay)

	assertSuggestedTracksHaveBeenAcceptedDelay := defaultDuration * 20
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		expectedMtvStateTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggestMetadata[0].ID,
						Title:      tracksToSuggestMetadata[0].Title,
						ArtistName: tracksToSuggestMetadata[0].ArtistName,
						Duration:   0,
					},

					Score: 1,
				},
				Duration: tracksToSuggestMetadata[0].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggestMetadata[1].ID,
						Title:      tracksToSuggestMetadata[1].Title,
						ArtistName: tracksToSuggestMetadata[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracksToSuggestMetadata[1].Duration.Milliseconds(),
			},
		}

		s.Equal(expectedMtvStateTracks, mtvState.Tracks)
	}, assertSuggestedTracksHaveBeenAcceptedDelay)

	secondSuggestTracksSignalDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared.SuggestTracksSignalArgs{
			TracksToSuggest: []string{tracksToSuggestMetadata[0].ID},
			UserID:          suggesterUserID,
			DeviceID:        suggesterDeviceID,
		})
	}, secondSuggestTracksSignalDelay)

	assertDuplicateSuggestedTrackHasNotBeenAcceptedDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		expectedMtvStateTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggestMetadata[0].ID,
						Title:      tracksToSuggestMetadata[0].Title,
						ArtistName: tracksToSuggestMetadata[0].ArtistName,
						Duration:   0,
					},

					Score: 1,
				},
				Duration: tracksToSuggestMetadata[0].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggestMetadata[1].ID,
						Title:      tracksToSuggestMetadata[1].Title,
						ArtistName: tracksToSuggestMetadata[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracksToSuggestMetadata[1].Duration.Milliseconds(),
			},
		}

		s.Len(mtvState.Tracks, 3)
		s.Equal(expectedMtvStateTracks, mtvState.Tracks)
	}, assertDuplicateSuggestedTrackHasNotBeenAcceptedDelay)

	thirdSuggestTracksSignalDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared.SuggestTracksSignalArgs{
			TracksToSuggest: []string{tracks[1].ID},
			UserID:          suggesterUserID,
			DeviceID:        suggesterDeviceID,
		})
	}, thirdSuggestTracksSignalDelay)

	assertDuplicateFromTracksListSuggestedTrackHasNotBeenAcceptedDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		expectedMtvStateTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 2,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggestMetadata[0].ID,
						Title:      tracksToSuggestMetadata[0].Title,
						ArtistName: tracksToSuggestMetadata[0].ArtistName,
						Duration:   0,
					},

					Score: 1,
				},
				Duration: tracksToSuggestMetadata[0].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggestMetadata[1].ID,
						Title:      tracksToSuggestMetadata[1].Title,
						ArtistName: tracksToSuggestMetadata[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracksToSuggestMetadata[1].Duration.Milliseconds(),
			},
		}

		s.Len(mtvState.Tracks, 3)
		s.Equal(expectedMtvStateTracks, mtvState.Tracks)
	}, assertDuplicateFromTracksListSuggestedTrackHasNotBeenAcceptedDelay)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_TracksSuggestedBeforePreviousSuggestedTracksInformationHaveBeenFetchedAreNotLost() {
	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksExposedMetadata := []shared.TrackMetadataWithScoreWithDuration{
		{
			TrackMetadataWithScore: shared.TrackMetadataWithScore{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[0].ID,
					Title:      tracks[0].Title,
					ArtistName: tracks[0].ArtistName,
					Duration:   0,
				},
				Score: 1,
			},
			Duration: tracks[0].Duration.Milliseconds(),
		},
		{
			TrackMetadataWithScore: shared.TrackMetadataWithScore{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[1].ID,
					Title:      tracks[1].Title,
					ArtistName: tracks[1].ArtistName,
					Duration:   0,
				},
				Score: 1,
			},
			Duration: tracks[1].Duration.Milliseconds(),
		},
	}
	tracksIDs := []string{tracks[0].ID, tracks[1].ID}
	firstTracksIDsToSuggest := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	secondTracksIDsToSuggest := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	suggesterUserID := faker.UUIDHyphenated()
	suggesterDeviceID := faker.UUIDHyphenated()
	firstTracksToSuggestMetadata := []shared.TrackMetadata{
		{
			ID:         firstTracksIDsToSuggest[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         firstTracksIDsToSuggest[1],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	secondTracksToSuggestMetadata := []shared.TrackMetadata{
		{
			ID:         secondTracksIDsToSuggest[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         secondTracksIDsToSuggest[1],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	firstTracksToSuggestExposedMetadata := []shared.TrackMetadataWithScoreWithDuration{
		{
			TrackMetadataWithScore: shared.TrackMetadataWithScore{
				TrackMetadata: shared.TrackMetadata{
					ID:         firstTracksToSuggestMetadata[0].ID,
					Title:      firstTracksToSuggestMetadata[0].Title,
					ArtistName: firstTracksToSuggestMetadata[0].ArtistName,
					Duration:   0,
				},
				Score: 1,
			},
			Duration: firstTracksToSuggestMetadata[0].Duration.Milliseconds(),
		},
		{
			TrackMetadataWithScore: shared.TrackMetadataWithScore{
				TrackMetadata: shared.TrackMetadata{
					ID:         firstTracksToSuggestMetadata[1].ID,
					Title:      firstTracksToSuggestMetadata[1].Title,
					ArtistName: firstTracksToSuggestMetadata[1].ArtistName,
					Duration:   0,
				},
				Score: 1,
			},
			Duration: firstTracksToSuggestMetadata[1].Duration.Milliseconds(),
		},
	}
	secondTracksToSuggestExposedMetadata := []shared.TrackMetadataWithScoreWithDuration{
		{
			TrackMetadataWithScore: shared.TrackMetadataWithScore{
				TrackMetadata: shared.TrackMetadata{
					ID:         secondTracksToSuggestMetadata[0].ID,
					Title:      secondTracksToSuggestMetadata[0].Title,
					ArtistName: secondTracksToSuggestMetadata[0].ArtistName,
					Duration:   0,
				},
				Score: 1,
			},
			Duration: secondTracksToSuggestMetadata[0].Duration.Milliseconds(),
		},
		{
			TrackMetadataWithScore: shared.TrackMetadataWithScore{
				TrackMetadata: shared.TrackMetadata{
					ID:         secondTracksToSuggestMetadata[1].ID,
					Title:      secondTracksToSuggestMetadata[1].Title,
					ArtistName: secondTracksToSuggestMetadata[1].ArtistName,
					Duration:   0,
				},
				Score: 1,
			},
			Duration: secondTracksToSuggestMetadata[1].Duration.Milliseconds(),
		},
	}
	params, _ := getWokflowInitParams(tracksIDs, 1)

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()
	defaultDuration := 1 * time.Millisecond

	defer resetMock()

	// Mock first tracks information fetching
	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()

	// Mock suggested and accepted tracks information fetching
	// Make the first mock of the activity return a long time after the next one
	// to simulate a race condition.
	s.env.OnActivity(
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		firstTracksIDsToSuggest,
		suggesterUserID,
		suggesterDeviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: firstTracksToSuggestMetadata,
		UserID:   suggesterUserID,
		DeviceID: suggesterDeviceID,
	}, nil).Once().After(10 * time.Second)
	s.env.OnActivity(
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		secondTracksIDsToSuggest,
		suggesterUserID,
		suggesterDeviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: secondTracksToSuggestMetadata,
		UserID:   suggesterUserID,
		DeviceID: suggesterDeviceID,
	}, nil).Once()

	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.NotifySuggestOrVoteUpdateActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)
	s.env.OnActivity(
		activities.AcknowledgeTracksSuggestion,
		mock.Anything,
		mock.Anything,
	).Return(nil).Twice()

	joinSuggesterUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           suggesterDeviceID,
			UserID:             suggesterUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, joinSuggesterUser)

	firstSuggestTracksSignalDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared.SuggestTracksSignalArgs{
			TracksToSuggest: firstTracksIDsToSuggest,
			UserID:          suggesterUserID,
			DeviceID:        suggesterDeviceID,
		})
	}, firstSuggestTracksSignalDelay)

	secondSuggestTracksSignalDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared.SuggestTracksSignalArgs{
			TracksToSuggest: secondTracksIDsToSuggest,
			UserID:          suggesterUserID,
			DeviceID:        suggesterDeviceID,
		})
	}, secondSuggestTracksSignalDelay)

	assertSecondSuggestedTrackHasBeenAcceptedDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)
		initialTrackAndSecondTracksToSuggest := append([]shared.TrackMetadataWithScoreWithDuration{}, tracksExposedMetadata[1])
		initialTrackAndSecondTracksToSuggest = append(initialTrackAndSecondTracksToSuggest, secondTracksToSuggestExposedMetadata...)

		s.Len(mtvState.Tracks, 3)
		s.Equal(initialTrackAndSecondTracksToSuggest, mtvState.Tracks)
	}, assertSecondSuggestedTrackHasBeenAcceptedDelay)

	assertAllSuggestedTracksHaveBeenAcceptedAfterEveryFetchingHasEndedDelay := 15 * time.Second
	registerDelayedCallbackWrapper(func() {
		allSuggestedTracks := append([]shared.TrackMetadataWithScoreWithDuration{}, tracksExposedMetadata[1])
		allSuggestedTracks = append(allSuggestedTracks, secondTracksToSuggestExposedMetadata...)
		allSuggestedTracks = append(allSuggestedTracks, firstTracksToSuggestExposedMetadata...)

		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.Len(mtvState.Tracks, 5)
		s.Equal(allSuggestedTracks, mtvState.Tracks)
	}, assertAllSuggestedTracksHaveBeenAcceptedAfterEveryFetchingHasEndedDelay)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_VoteForTrack() {
	var (
		fakeUserID      = faker.UUIDHyphenated()
		joiningUserID   = faker.UUIDHyphenated()
		joiningDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksToSuggest := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		}, {
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID, tracks[1].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 1)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.JoinActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.UserVoteForTrackAcknowledgement,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.NotifySuggestOrVoteUpdateActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(1)
	s.env.OnActivity(
		activities.AcknowledgeTracksSuggestionFail,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(1)

	//Verify that creator has voted for the initialTracks and that he cannot vote or vote by suggest again
	checkCreatorTracksVotedFor := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:   params.RoomCreatorUserID,
			DeviceID: creatorDeviceID,
			TracksVotedFor: []string{
				tracks[1].ID,
			},
			HasControlAndDelegationPermission: true,
		}

		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
	}, checkCreatorTracksVotedFor)

	//Here we're checking that the initialTracks score is not incremented
	//As we cannot suggest/suggest-into-vote for the currentTrack or a track a user has already voted for
	//Here the first initial track is the currentTrack and the other one from the queue is counted
	//As creator voted for
	emitSuggestForAnInitialTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared.SuggestTracksSignalArgs{
			TracksToSuggest: tracksIDs,
			UserID:          params.RoomCreatorUserID,
			DeviceID:        creatorDeviceID,
		})
	}, emitSuggestForAnInitialTrack)

	checkForSuggestFails := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expected := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
		}

		s.Equal(expected, mtvState.Tracks)
	}, checkForSuggestFails)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	checkJoinSuccess := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.Equal(2, mtvState.UsersLength)
	}, checkJoinSuccess)

	suggestedTracks := []shared.TrackMetadata{
		tracks[1], //will be counted as vote normally
		tracksToSuggest[0],
		tracksToSuggest[1],
	}
	s.mockOnceSuggest(joiningUserID, joiningDeviceID, params.RoomID, suggestedTracks[1:])
	emitSuggestForJoiningUserOnTrackAlreadyInTheListAndTwoNewOne := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared.SuggestTracksSignalArgs{
			TracksToSuggest: []string{
				suggestedTracks[0].ID,
				suggestedTracks[1].ID,
				suggestedTracks[2].ID,
			},
			UserID:   joiningUserID,
			DeviceID: joiningDeviceID,
		})
	}, emitSuggestForJoiningUserOnTrackAlreadyInTheListAndTwoNewOne)

	checkForSuggest := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expected := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 2,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggest[0].ID,
						Title:      tracksToSuggest[0].Title,
						ArtistName: tracksToSuggest[0].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracksToSuggest[0].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggest[1].ID,
						Title:      tracksToSuggest[1].Title,
						ArtistName: tracksToSuggest[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracksToSuggest[1].Duration.Milliseconds(),
			},
		}

		s.Equal(expected, mtvState.Tracks)
	}, checkForSuggest)

	emitVoteForCreatorForAlreadyVoted := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared.NewVoteForTrackSignalArgs{
			UserID:  params.RoomCreatorUserID,
			TrackID: tracks[1].ID,
		})
	}, emitVoteForCreatorForAlreadyVoted)

	alsoEmitVoteForUnkownUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared.NewVoteForTrackSignalArgs{
			UserID:  fakeUserID,
			TrackID: tracks[1].ID,
		})
	}, alsoEmitVoteForUnkownUser)

	alsoEmitVoteForUnkownTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared.NewVoteForTrackSignalArgs{
			UserID:  params.RoomCreatorUserID,
			TrackID: faker.UUIDHyphenated(),
		})
	}, alsoEmitVoteForUnkownTrack)

	checkNothingHappened := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		expected := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 2,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggest[0].ID,
						Title:      tracksToSuggest[0].Title,
						ArtistName: tracksToSuggest[0].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracksToSuggest[0].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggest[1].ID,
						Title:      tracksToSuggest[1].Title,
						ArtistName: tracksToSuggest[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracksToSuggest[1].Duration.Milliseconds(),
			},
		}

		s.Equal(expected, mtvState.Tracks)
	}, checkNothingHappened)

	emitVoteForCreatorForNotVotedTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared.NewVoteForTrackSignalArgs{
			TrackID: tracksToSuggest[1].ID,
			UserID:  params.RoomCreatorUserID,
		})
	}, emitVoteForCreatorForNotVotedTrack)

	checkVoteCounted := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		expected := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 2,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggest[1].ID,
						Title:      tracksToSuggest[1].Title,
						ArtistName: tracksToSuggest[1].ArtistName,
						Duration:   0,
					},
					Score: 2,
				},
				Duration: tracksToSuggest[1].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggest[0].ID,
						Title:      tracksToSuggest[0].Title,
						ArtistName: tracksToSuggest[0].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracksToSuggest[0].Duration.Milliseconds(),
			},
		}

		s.Equal(expected, mtvState.Tracks)
	}, checkVoteCounted)

	//Test that a finished track can be suggest again and voted again
	emitGoToNextTrackSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitGoToNextTrackSignal(shared.NewGoToNextTrackSignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, emitGoToNextTrackSignal)

	previousCurrentTrackToSuggest := []shared.TrackMetadata{
		tracks[0],
	}
	emitSuggestForPastCurrentTrack := defaultDuration
	s.mockOnceSuggest(params.RoomCreatorUserID, creatorDeviceID, params.RoomID, previousCurrentTrackToSuggest)

	registerDelayedCallbackWrapper(func() {

		s.emitSuggestTrackSignal(shared.SuggestTracksSignalArgs{
			TracksToSuggest: []string{
				previousCurrentTrackToSuggest[0].ID,
			},
			UserID:   params.RoomCreatorUserID,
			DeviceID: creatorDeviceID,
		})
	}, emitSuggestForPastCurrentTrack)

	checkThatCreatorCouldSuggestAndVoteForPreviousCurrentTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		expectedCurrentTrackID := tracks[1].ID

		expected := []shared.TrackMetadataWithScoreWithDuration{

			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggest[1].ID,
						Title:      tracksToSuggest[1].Title,
						ArtistName: tracksToSuggest[1].ArtistName,
						Duration:   0,
					},
					Score: 2,
				},
				Duration: tracksToSuggest[1].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggest[0].ID,
						Title:      tracksToSuggest[0].Title,
						ArtistName: tracksToSuggest[0].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracksToSuggest[0].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[0].ID,
						Title:      tracks[0].Title,
						ArtistName: tracks[0].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracks[0].Duration.Milliseconds(),
			},
		}

		s.Equal(expectedCurrentTrackID, mtvState.CurrentTrack.ID)
		s.Equal(expected, mtvState.Tracks)
	}, checkThatCreatorCouldSuggestAndVoteForPreviousCurrentTrack)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_EmptyCurrentTrackAutoPlayAfterOneGetReadyToBePlayed() {
	var (
		joiningUserID   = faker.UUIDHyphenated()
		joiningDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID, tracks[1].ID, tracks[2].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 2)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    tracksIDs,
			HasControlAndDelegationPermission: true,
		}

		s.False(mtvState.Playing)
		s.Equal(2, mtvState.MinimumScoreToBePlayed)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
	}, init)

	emitGoToNextTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitGoToNextTrackSignal(shared.NewGoToNextTrackSignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, emitGoToNextTrack)

	checkNothingHappened := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)
		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			HasControlAndDelegationPermission: true,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    tracksIDs,
		}

		s.False(mtvState.Playing)
		s.Equal(2, mtvState.MinimumScoreToBePlayed)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
	}, checkNothingHappened)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	joiningUserVoteForTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared.NewVoteForTrackSignalArgs{
			TrackID: tracksIDs[2],
			UserID:  joiningUserID,
		})
	}, joiningUserVoteForTrack)

	//Here we test the auto play after a track from not ready to be played
	//one finally get the required score amount
	checkJoinAndVoteWorkedAlsoRoomIsPlaying := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUserRelatedInformation := &shared.InternalStateUser{
			UserID:                            joiningUserID,
			DeviceID:                          joiningDeviceID,
			TracksVotedFor:                    []string{},
			HasControlAndDelegationPermission: false,
		}

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{

			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[0].ID,
						Title:      tracks[0].Title,
						ArtistName: tracks[0].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracks[0].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
		}

		s.Equal(tracks[2].ID, mtvState.CurrentTrack.ID)
		s.Equal(2, mtvState.UsersLength)
		s.True(mtvState.Playing)
		s.Equal(expectedJoiningUserRelatedInformation, mtvState.UserRelatedInformation)
		s.Equal(expectedTracks, mtvState.Tracks)
	}, checkJoinAndVoteWorkedAlsoRoomIsPlaying)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_LoadedCurrentTrackAndReadyToBePlayedListNoAutoPlayAfterOneGetReadyToBePlayed() {
	var (
		joiningUserID   = faker.UUIDHyphenated()
		joiningDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID, tracks[1].ID, tracks[2].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 1)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:   params.RoomCreatorUserID,
			DeviceID: creatorDeviceID,
			TracksVotedFor: []string{
				//reversed because we remove tracksVotedFor element using unordered method
				tracks[2].ID,
				tracks[1].ID,
			},
			HasControlAndDelegationPermission: true,
		}

		s.False(mtvState.Playing)
		s.Equal(1, mtvState.MinimumScoreToBePlayed)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
	}, init)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	joiningUserVoteForTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared.NewVoteForTrackSignalArgs{
			TrackID: tracksIDs[2],
			UserID:  joiningUserID,
		})
	}, joiningUserVoteForTrack)

	checkJoinAndVoteWorkedAlsoRoomIsNotPlaying := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUserRelatedInformation := &shared.InternalStateUser{
			UserID:   joiningUserID,
			DeviceID: joiningDeviceID,
			TracksVotedFor: []string{
				tracksIDs[2],
			},
			HasControlAndDelegationPermission: false,
		}

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[2].ID,
						Title:      tracks[2].Title,
						ArtistName: tracks[2].ArtistName,
						Duration:   0,
					},
					Score: 2,
				},
				Duration: tracks[2].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
		}

		s.Equal(tracks[0].ID, mtvState.CurrentTrack.ID)
		s.Equal(2, mtvState.UsersLength)
		s.False(mtvState.Playing)
		s.Equal(expectedJoiningUserRelatedInformation, mtvState.UserRelatedInformation)
		s.Equal(expectedTracks, mtvState.Tracks)
	}, checkJoinAndVoteWorkedAlsoRoomIsNotPlaying)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_LoadedAndEndedCurrentTrackAndNoTrackReadyToBePlayedAutoPlayAfterOneGetReadyToBePlayed() {
	var (
		joiningUserID   = faker.UUIDHyphenated()
		joiningDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 2)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:   params.RoomCreatorUserID,
			DeviceID: creatorDeviceID,
			TracksVotedFor: []string{
				tracks[0].ID,
			},
			HasControlAndDelegationPermission: true,
		}

		s.False(mtvState.Playing)
		s.Equal(2, mtvState.MinimumScoreToBePlayed)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
	}, init)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	joiningUserVoteForTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared.NewVoteForTrackSignalArgs{
			TrackID: tracksIDs[0],
			UserID:  joiningUserID,
		})
	}, joiningUserVoteForTrack)

	checkJoinAndVoteWorkedAlsoRoomIsPlaying := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUserRelatedInformation := &shared.InternalStateUser{
			UserID:                            joiningUserID,
			DeviceID:                          joiningDeviceID,
			TracksVotedFor:                    []string{},
			HasControlAndDelegationPermission: false,
		}

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{}

		s.Equal(tracks[0].ID, mtvState.CurrentTrack.ID)
		s.Equal(2, mtvState.UsersLength)
		s.True(mtvState.Playing)
		s.Equal(expectedJoiningUserRelatedInformation, mtvState.UserRelatedInformation)
		s.Equal(expectedTracks, mtvState.Tracks)
	}, checkJoinAndVoteWorkedAlsoRoomIsPlaying)

	justWaitEndOfCurrentTrack := tracks[0].Duration
	registerDelayedCallbackWrapper(func() {
	}, justWaitEndOfCurrentTrack)

	checkCurrentTrack := defaultDuration * 10
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedExposedCurrentTrack := &shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[0].ID,
						ArtistName: tracks[0].ArtistName,
						Title:      tracks[0].Title,
						Duration:   0,
					},

					Score: 2,
				},
				AlreadyElapsed: 0,
			},
			Duration: tracks[0].Duration.Milliseconds(),
			Elapsed:  tracks[0].Duration.Milliseconds(),
		}

		s.False(mtvState.Playing)
		s.Equal(mtvState.CurrentTrack, expectedExposedCurrentTrack)
	}, checkCurrentTrack)

	trackToSuggest := shared.TrackMetadata{
		ID:         faker.UUIDHyphenated(),
		Title:      faker.Word(),
		ArtistName: faker.Name(),
		Duration:   random.GenerateRandomDuration(),
	}

	creatorSuggestSong := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared.SuggestTracksSignalArgs{
			DeviceID:        creatorDeviceID,
			UserID:          params.RoomCreatorUserID,
			TracksToSuggest: []string{trackToSuggest.ID},
		})
	}, creatorSuggestSong)

	s.mockOnceSuggest(params.RoomCreatorUserID, creatorDeviceID, params.RoomID, []shared.TrackMetadata{trackToSuggest})
	checkSuggestWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         trackToSuggest.ID,
						Title:      trackToSuggest.Title,
						ArtistName: trackToSuggest.ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: trackToSuggest.Duration.Milliseconds(),
			},
		}

		s.False(mtvState.Playing)
		s.Equal(expectedTracks, mtvState.Tracks)
	}, checkSuggestWorked)

	joiningUserVoteForSuggestedTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared.NewVoteForTrackSignalArgs{
			TrackID: trackToSuggest.ID,
			UserID:  joiningUserID,
		})
	}, joiningUserVoteForSuggestedTrack)

	checkThatRoomAutoPlayed := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUser := &shared.InternalStateUser{
			UserID:                            joiningUserID,
			DeviceID:                          joiningDeviceID,
			TracksVotedFor:                    []string{},
			HasControlAndDelegationPermission: false,
		}

		expectedExposedCurrentTrack := &shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         trackToSuggest.ID,
						ArtistName: trackToSuggest.ArtistName,
						Title:      trackToSuggest.Title,
						Duration:   0,
					},

					Score: 2,
				},
				AlreadyElapsed: 0,
			},
			Duration: trackToSuggest.Duration.Milliseconds(),
			Elapsed:  1,
		}

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{}

		s.True(mtvState.Playing)
		s.Equal(expectedJoiningUser, mtvState.UserRelatedInformation)
		s.Equal(mtvState.CurrentTrack, expectedExposedCurrentTrack)
		s.Equal(mtvState.Tracks, expectedTracks)
	}, checkThatRoomAutoPlayed)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_CreateRoomWithPositionAndTimeConstraintAndTestPositionConstraint() {

	falseValue := false
	trueValue := true
	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID, tracks[1].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	start := time.Now()

	end := start.Add(defaultDuration * 5000)

	physicalAndTimeConstraints := shared.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   end,
		PhysicalConstraintStartsAt: start,
	}

	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.InitialUsers[params.RoomCreatorUserID].UserFitsPositionConstraint = &falseValue

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        &falseValue,
			HasControlAndDelegationPermission: true,
		}

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[0].ID,
						Title:      tracks[0].Title,
						ArtistName: tracks[0].ArtistName,
						Duration:   0,
					},
					Score: 0,
				},
				Duration: tracks[0].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 0,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
		}

		s.False(mtvState.Playing)
		s.Equal(1, mtvState.MinimumScoreToBePlayed)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.Equal(expectedTracks, mtvState.Tracks)
		s.True(mtvState.RoomHasTimeAndPositionConstraints)
	}, init)

	updateCreatorAbilityToVoteForTime := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateUserPositionPermissionSignal(shared.NewUpdateUserFitsPositionConstraintSignalArgs{
			UserID:                     params.RoomCreatorUserID,
			UserFitsPositionConstraint: true,
		})
	}, updateCreatorAbilityToVoteForTime)

	checkPositionUpdateWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        &trueValue,
			HasControlAndDelegationPermission: true,
		}

		s.False(mtvState.Playing)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
	}, checkPositionUpdateWorked)

	voteForAnExistingTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared.NewVoteForTrackSignalArgs{
			UserID:  params.RoomCreatorUserID,
			TrackID: tracks[0].ID,
		})
	}, voteForAnExistingTrack)

	checkVoteWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        &trueValue,
			HasControlAndDelegationPermission: true,
		}

		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.True(mtvState.Playing)
		s.Equal(tracks[0].ID, mtvState.CurrentTrack.ID)
	}, checkVoteWorked)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_CreateRoomWithPositionAndTimeConstraintAndTestTimeConstraint() {

	falseValue := false
	trueValue := true
	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID, tracks[1].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	start := time.Now()

	end := start.Add(defaultDuration * 5000)

	physicalAndTimeConstraints := shared.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   end,
		PhysicalConstraintStartsAt: start,
	}

	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.InitialUsers[params.RoomCreatorUserID].UserFitsPositionConstraint = &falseValue

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        &falseValue,
			HasControlAndDelegationPermission: true,
		}

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[0].ID,
						Title:      tracks[0].Title,
						ArtistName: tracks[0].ArtistName,
						Duration:   0,
					},
					Score: 0,
				},
				Duration: tracks[0].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 0,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
		}

		s.False(mtvState.Playing)
		s.Equal(1, mtvState.MinimumScoreToBePlayed)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.Equal(expectedTracks, mtvState.Tracks)
	}, init)

	updateCreatorAbilityToVoteForTime := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateUserPositionPermissionSignal(shared.NewUpdateUserFitsPositionConstraintSignalArgs{
			UserID:                     params.RoomCreatorUserID,
			UserFitsPositionConstraint: true,
		})
	}, updateCreatorAbilityToVoteForTime)

	checkPositionUpdateWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        &trueValue,
			HasControlAndDelegationPermission: true,
		}

		s.False(mtvState.Playing)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
	}, checkPositionUpdateWorked)

	voteForAnExistingTrack := 5001 * defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared.NewVoteForTrackSignalArgs{
			UserID:  params.RoomCreatorUserID,
			TrackID: tracks[0].ID,
		})
	}, voteForAnExistingTrack)

	checkVoteDidntWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        &trueValue,
			HasControlAndDelegationPermission: true,
		}

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[0].ID,
						Title:      tracks[0].Title,
						ArtistName: tracks[0].ArtistName,
						Duration:   0,
					},
					Score: 0,
				},
				Duration: tracks[0].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 0,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
		}

		s.False(mtvState.Playing)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.Equal(expectedTracks, mtvState.Tracks)
	}, checkVoteDidntWorked)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_CreateDirectRoomAndUpdateDelegationOwner() {

	var (
		joiningUserID       = faker.UUIDHyphenated()
		joiningUserDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	params.PlayingMode = shared.MtvPlayingModeDirect
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.AcknowledgeUpdateDelegationOwner,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared.MtvPlayingModeDirect, mtvState.PlayingMode)
		s.Equal(&params.RoomCreatorUserID, mtvState.DelegationOwnerUserID)
	}, init)

	updateDelegationOwnerWithEmptyNewDelegationOwner := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: "",
			EmitterUserID:            params.RoomCreatorUserID,
		})
	}, updateDelegationOwnerWithEmptyNewDelegationOwner)

	updateDelegationOwnerWithEmptyEmitter := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: faker.UUIDHyphenated(),
			EmitterUserID:            "",
		})
	}, updateDelegationOwnerWithEmptyEmitter)

	updateDelegationOwnerWithNunExistingUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: joiningUserID,
			EmitterUserID:            params.RoomCreatorUserID,
		})
	}, updateDelegationOwnerWithNunExistingUser)

	checkNothingWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared.MtvPlayingModeDirect, mtvState.PlayingMode)
		s.Equal(&params.RoomCreatorUserID, mtvState.DelegationOwnerUserID)
	}, checkNothingWorked)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	updateDelegationOwnerWithExistingUserWithoutPermissions := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: joiningUserID,
			EmitterUserID:            joiningUserID,
		})
	}, updateDelegationOwnerWithExistingUserWithoutPermissions)

	checkNothingWorked = defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)
		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}

		s.Equal(2, mtvState.UsersLength)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared.MtvPlayingModeDirect, mtvState.PlayingMode)
		s.Equal(&params.RoomCreatorUserID, mtvState.DelegationOwnerUserID)
	}, checkNothingWorked)

	updateDelegationOwner := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: joiningUserID,
			EmitterUserID:            params.RoomCreatorUserID,
		})
	}, updateDelegationOwner)

	checkItWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)
		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}

		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared.MtvPlayingModeDirect, mtvState.PlayingMode)
		s.Equal(&joiningUserID, mtvState.DelegationOwnerUserID)
	}, checkItWorked)

	delegationOwnerLeaveRoom := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitLeaveSignal(joiningUserID)
	}, delegationOwnerLeaveRoom)

	checkDelegationOwnerReset := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)
		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}

		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared.MtvPlayingModeDirect, mtvState.PlayingMode)
		s.Equal(params.RoomCreatorUserID, *mtvState.DelegationOwnerUserID)
	}, checkDelegationOwnerReset)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_CreateBroadcastRoomAndAttemptToExecuteDelegationOperation() {

	var (
		joiningUserID       = faker.UUIDHyphenated()
		joiningUserDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	params.PlayingMode = shared.MtvPlayingModeBroadcast
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.AcknowledgeUpdateDelegationOwner,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}

		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared.MtvPlayingModeBroadcast, mtvState.PlayingMode)
		s.Nil(mtvState.DelegationOwnerUserID)
	}, init)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	updateDelegationOwner := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: joiningUserID,
			EmitterUserID:            params.RoomCreatorUserID,
		})
	}, updateDelegationOwner)

	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}

		s.Equal(2, mtvState.UsersLength)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared.MtvPlayingModeBroadcast, mtvState.PlayingMode)
		s.Nil(mtvState.DelegationOwnerUserID)
	}, init)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_CanUpdateControlAndDelegationPermission() {
	var (
		joiningUserID       = faker.UUIDHyphenated()
		joiningUserDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.AcknowledgeUpdateControlAndDelegationPermission,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
	}, init)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	userHasBeenAddedAndHasNotControlAndDelegationPermissionByDefault := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		s.Equal(2, mtvState.UsersLength)
		s.Equal(joiningUserID, mtvState.UserRelatedInformation.UserID)
		s.Equal(false, mtvState.UserRelatedInformation.HasControlAndDelegationPermission)
	}, userHasBeenAddedAndHasNotControlAndDelegationPermissionByDefault)

	updateAddedUserControlAndDelegationPermission := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateControlAndDelegationPermissionSignal(shared.NewUpdateControlAndDelegationPermissionSignalArgs{
			ToUpdateUserID:                    joiningUserID,
			HasControlAndDelegationPermission: true,
		})
	}, updateAddedUserControlAndDelegationPermission)

	addedUserHasControlAndDelegationPermission := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		s.Equal(joiningUserID, mtvState.UserRelatedInformation.UserID)
		s.Equal(true, mtvState.UserRelatedInformation.HasControlAndDelegationPermission)
	}, addedUserHasControlAndDelegationPermission)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_GetUsersListQuery() {

	var (
		joiningUserID       = faker.UUIDHyphenated()
		joiningUserDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID}
	params, _ := getWokflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	params.PlayingMode = shared.MtvPlayingModeBroadcast
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		usersList := s.getUsersList()

		expectedUsersList := []shared.ExposedInternalStateUserListElement{
			{
				UserID:                            params.RoomCreatorUserID,
				HasControlAndDelegationPermission: true,
				IsCreator:                         true,
				IsDelegationOwner:                 false,
			},
		}

		s.Equal(expectedUsersList, usersList)
	}, init)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		usersList := s.getUsersList()

		expectedUsersList := []shared.ExposedInternalStateUserListElement{
			{
				UserID:                            params.RoomCreatorUserID,
				HasControlAndDelegationPermission: true,
				IsCreator:                         true,
				IsDelegationOwner:                 false,
			},
			{
				UserID:                            joiningUserID,
				HasControlAndDelegationPermission: false,
				IsCreator:                         false,
				IsDelegationOwner:                 false,
			},
		}

		s.ElementsMatch(expectedUsersList, usersList)
	}, checkJoinWorked)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_GetUsersListQueryInDirectRoom() {

	var (
		joiningUserID       = faker.UUIDHyphenated()
		joiningUserDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID}
	params, _ := getWokflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	params.PlayingMode = shared.MtvPlayingModeDirect
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.AcknowledgeUpdateDelegationOwner,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		usersList := s.getUsersList()

		expectedUsersList := []shared.ExposedInternalStateUserListElement{
			{
				UserID:                            params.RoomCreatorUserID,
				HasControlAndDelegationPermission: true,
				IsCreator:                         true,
				IsDelegationOwner:                 true,
			},
		}

		s.Equal(expectedUsersList, usersList)
	}, init)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	updateDelegationOwner := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: joiningUserID,
			EmitterUserID:            params.RoomCreatorUserID,
		})
	}, updateDelegationOwner)

	checkOperationsWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		usersList := s.getUsersList()

		expectedUsersList := []shared.ExposedInternalStateUserListElement{
			{
				UserID:                            params.RoomCreatorUserID,
				HasControlAndDelegationPermission: true,
				IsCreator:                         true,
				IsDelegationOwner:                 false,
			},
			{
				UserID:                            joiningUserID,
				HasControlAndDelegationPermission: false,
				IsCreator:                         false,
				IsDelegationOwner:                 true,
			},
		}

		s.ElementsMatch(expectedUsersList, usersList)
	}, checkOperationsWorked)

	emitLeave := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitLeaveSignal(joiningUserID)
	}, emitLeave)

	checkDelegationOwnerResetAndUserListUpdate := defaultDuration
	registerDelayedCallbackWrapper(func() {
		usersList := s.getUsersList()

		expectedUsersList := []shared.ExposedInternalStateUserListElement{
			{
				UserID:                            params.RoomCreatorUserID,
				HasControlAndDelegationPermission: true,
				IsCreator:                         true,
				IsDelegationOwner:                 true,
			},
		}

		s.Equal(expectedUsersList, usersList)
	}, checkDelegationOwnerResetAndUserListUpdate)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_UserHasControlAndDelegationPermissionPlay() {

	var (
		joiningUserID       = faker.UUIDHyphenated()
		joiningUserDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	params.PlayingMode = shared.MtvPlayingModeDirect
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
	}, init)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUser := &shared.InternalStateUser{
			UserID:                            joiningUserID,
			DeviceID:                          joiningUserDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: false,
		}
		s.Equal(expectedJoiningUser, mtvState.UserRelatedInformation)
	}, checkJoinWorked)

	emitPlaySignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitPlaySignal(shared.NewPlaySignalArgs{
			UserID: joiningUserID,
		})
	}, emitPlaySignal)

	checkPlayFailed := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		s.False(mtvState.Playing)
	}, checkPlayFailed)

	emitUpdateUserControlAndDelegationPermission := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateControlAndDelegationPermissionSignal(shared.NewUpdateControlAndDelegationPermissionSignalArgs{
			HasControlAndDelegationPermission: true,
			ToUpdateUserID:                    joiningUserID,
		})
	}, emitUpdateUserControlAndDelegationPermission)

	secondEmitPlaySignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitPlaySignal(shared.NewPlaySignalArgs{
			UserID: joiningUserID,
		})
	}, secondEmitPlaySignal)

	checkEmitPlayWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		s.True(mtvState.UserRelatedInformation.HasControlAndDelegationPermission)
		s.True(mtvState.Playing)
	}, checkEmitPlayWorked)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_UserHasControlAndDelegationPermissionPause() {

	var (
		joiningUserID       = faker.UUIDHyphenated()
		joiningUserDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	params.PlayingMode = shared.MtvPlayingModeDirect
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	//First call after initial tracks fetch
	//Second call after Custom emit pause signal
	s.env.OnActivity(
		activities.PauseActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
	}, init)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUser := &shared.InternalStateUser{
			UserID:                            joiningUserID,
			DeviceID:                          joiningUserDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: false,
		}
		s.Equal(expectedJoiningUser, mtvState.UserRelatedInformation)
	}, checkJoinWorked)

	emitPlaySignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitPlaySignal(shared.NewPlaySignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, emitPlaySignal)

	checkPlayWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.True(mtvState.Playing)
	}, checkPlayWorked)

	emitPauseSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitPlaySignal(shared.NewPlaySignalArgs{
			UserID: joiningUserID,
		})
	}, emitPauseSignal)

	checkPauseFailed := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		s.True(mtvState.Playing)
	}, checkPauseFailed)

	emitUpdateUserControlAndDelegationPermission := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateControlAndDelegationPermissionSignal(shared.NewUpdateControlAndDelegationPermissionSignalArgs{
			HasControlAndDelegationPermission: true,
			ToUpdateUserID:                    joiningUserID,
		})
	}, emitUpdateUserControlAndDelegationPermission)

	secondEmitPauseSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitPauseSignal(shared.NewPauseSignalArgs{
			UserID: joiningUserID,
		})
	}, secondEmitPauseSignal)

	checkEmitPauseWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		s.True(mtvState.UserRelatedInformation.HasControlAndDelegationPermission)
		s.False(mtvState.Playing)
	}, checkEmitPauseWorked)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_UserHasControlAndDelegationPermissionGoToNextTrack() {

	var (
		joiningUserID       = faker.UUIDHyphenated()
		joiningUserDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID, tracks[1].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{tracksIDs[1]},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
	}, init)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUser := &shared.InternalStateUser{
			UserID:                            joiningUserID,
			DeviceID:                          joiningUserDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: false,
		}
		s.Equal(expectedJoiningUser, mtvState.UserRelatedInformation)
	}, checkJoinWorked)

	emitGoToNextTrackSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitGoToNextTrackSignal(shared.NewGoToNextTrackSignalArgs{
			UserID: joiningUserID,
		})
	}, emitGoToNextTrackSignal)

	checkGoToNextTrackFailed := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared.NoRelatedUserID)

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
		}

		s.False(mtvState.Playing)
		s.Equal(expectedTracks, mtvState.Tracks)
		s.Equal(tracks[0].ID, mtvState.CurrentTrack.ID)
	}, checkGoToNextTrackFailed)

	emitUpdateUserControlAndDelegationPermission := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateControlAndDelegationPermissionSignal(shared.NewUpdateControlAndDelegationPermissionSignalArgs{
			HasControlAndDelegationPermission: true,
			ToUpdateUserID:                    joiningUserID,
		})
	}, emitUpdateUserControlAndDelegationPermission)

	secondEmitGoToNextTrackSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitGoToNextTrackSignal(shared.NewGoToNextTrackSignalArgs{
			UserID: joiningUserID,
		})
	}, secondEmitGoToNextTrackSignal)

	checkEmitGoToNextTrackWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{}

		s.True(mtvState.UserRelatedInformation.HasControlAndDelegationPermission)
		s.Equal(expectedTracks, mtvState.Tracks)
		s.Equal(tracks[1].ID, mtvState.CurrentTrack.ID)
		s.True(mtvState.Playing)

	}, checkEmitGoToNextTrackWorked)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_OnlyInvitedUsersAndCreatorCanVoteInOpenRoom() {

	var (
		joiningUserID       = faker.UUIDHyphenated()
		joiningUserDeviceID = faker.UUIDHyphenated()
		invitedUserID       = faker.UUIDHyphenated()
		invitedUserDeviceID = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksToSuggest := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	tracksIDs := []string{tracks[0].ID, tracks[1].ID}
	params, creatorDeviceID := getWokflowInitParams(tracksIDs, 1)
	params.IsOpenOnlyInvitedUsersCanVote = true
	defaultDuration := 1 * time.Millisecond

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		//TracksVotedFor with 1 element shows that creator even with UserHasBeenInvited to false can still vote
		expectedCreator := &shared.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{tracksIDs[1]},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
			UserHasBeenInvited:                false,
		}
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
	}, init)

	emitJoinSignalForJoiningUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignalForJoiningUser)

	emitJoinSignalForInvitedUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewJoinSignalArgs{
			DeviceID:           invitedUserDeviceID,
			UserID:             invitedUserID,
			UserHasBeenInvited: true,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignalForInvitedUser)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(invitedUserID)

		expectedJoiningUser := &shared.InternalStateUser{
			UserID:                            invitedUserID,
			DeviceID:                          invitedUserDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: false,
			UserHasBeenInvited:                true,
		}
		s.Equal(expectedJoiningUser, mtvState.UserRelatedInformation)
		s.Equal(3, mtvState.UsersLength)
	}, checkJoinWorked)

	//Emit vote for track with joiningUser
	emitVoteForJoiningUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewVoteForTrackSignalArgs{
			TrackID: tracksIDs[1],
			UserID:  joiningUserID,
		}
		s.emitVoteSignal(args)
	}, emitVoteForJoiningUser)

	checkDidntWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
		}
		s.Equal(expectedTracks, mtvState.Tracks)

		expectedJoiningUser := &shared.InternalStateUser{
			UserID:                            joiningUserID,
			DeviceID:                          joiningUserDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: false,
			UserHasBeenInvited:                false,
		}
		s.Equal(expectedJoiningUser, mtvState.UserRelatedInformation)
	}, checkDidntWorked)

	//Emit vote for track with invitedUser
	emitVoteForInvitedUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared.NewVoteForTrackSignalArgs{
			TrackID: tracksIDs[1],
			UserID:  invitedUserID,
		}
		s.emitVoteSignal(args)
	}, emitVoteForInvitedUser)

	checkWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(invitedUserID)

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 2,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
		}
		s.Equal(expectedTracks, mtvState.Tracks)

		expectedInvitedUser := &shared.InternalStateUser{
			UserID:                            invitedUserID,
			DeviceID:                          invitedUserDeviceID,
			TracksVotedFor:                    []string{tracksIDs[1]},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: false,
			UserHasBeenInvited:                true,
		}
		s.Equal(expectedInvitedUser, mtvState.UserRelatedInformation)
	}, checkWorked)

	//Suggest for joiningUser
	suggestedTracks := []shared.TrackMetadata{
		tracksToSuggest[0],
	}
	s.mockOnceSuggest(joiningUserID, joiningUserDeviceID, params.RoomID, suggestedTracks)
	emitSuggestForJoiningUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared.SuggestTracksSignalArgs{
			TracksToSuggest: []string{
				tracksToSuggest[0].ID,
			},
			UserID:   joiningUserID,
			DeviceID: joiningUserDeviceID,
		})
	}, emitSuggestForJoiningUser)

	checkJoiningUserSuggestDidNotMakeHimVoteForSuggestedTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 2,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggest[0].ID,
						Title:      tracksToSuggest[0].Title,
						ArtistName: tracksToSuggest[0].ArtistName,
						Duration:   0,
					},
					Score: 0,
				},
				Duration: tracksToSuggest[0].Duration.Milliseconds(),
			},
		}
		s.Equal(expectedTracks, mtvState.Tracks)

		expectedJoiningUser := &shared.InternalStateUser{
			UserID:                            joiningUserID,
			DeviceID:                          joiningUserDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: false,
			UserHasBeenInvited:                false,
		}
		s.Equal(expectedJoiningUser, mtvState.UserRelatedInformation)
	}, checkJoiningUserSuggestDidNotMakeHimVoteForSuggestedTrack)

	//Suggest for invitedUser
	invitedUserSuggestedTracks := []shared.TrackMetadata{
		tracksToSuggest[1],
	}
	s.mockOnceSuggest(invitedUserID, invitedUserDeviceID, params.RoomID, invitedUserSuggestedTracks)
	emitSuggestForInvitedUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared.SuggestTracksSignalArgs{
			TracksToSuggest: []string{
				tracksToSuggest[1].ID,
			},
			UserID:   invitedUserID,
			DeviceID: invitedUserDeviceID,
		})
	}, emitSuggestForInvitedUser)

	checkInvitedUserSuggestDidMakeHimVoteForSuggestedTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(invitedUserID)

		expectedTracks := []shared.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracks[1].ID,
						Title:      tracks[1].Title,
						ArtistName: tracks[1].ArtistName,
						Duration:   0,
					},
					Score: 2,
				},
				Duration: tracks[1].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggest[1].ID,
						Title:      tracksToSuggest[1].Title,
						ArtistName: tracksToSuggest[1].ArtistName,
						Duration:   0,
					},
					Score: 1,
				},
				Duration: tracksToSuggest[0].Duration.Milliseconds(),
			},
			{
				TrackMetadataWithScore: shared.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggest[0].ID,
						Title:      tracksToSuggest[0].Title,
						ArtistName: tracksToSuggest[0].ArtistName,
						Duration:   0,
					},
					Score: 0,
				},
				Duration: tracksToSuggest[0].Duration.Milliseconds(),
			},
		}
		s.Equal(expectedTracks, mtvState.Tracks)

		expectedInvitedUser := &shared.InternalStateUser{
			UserID:                            invitedUserID,
			DeviceID:                          invitedUserDeviceID,
			TracksVotedFor:                    []string{tracks[1].ID, tracksToSuggest[1].ID},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: false,
			UserHasBeenInvited:                true,
		}
		s.Equal(expectedInvitedUser, mtvState.UserRelatedInformation)
	}, checkInvitedUserSuggestDidMakeHimVoteForSuggestedTrack)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}
