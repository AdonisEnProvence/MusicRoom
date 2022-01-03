package mtv

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	"github.com/AdonisEnProvence/MusicRoom/mocks"
	activities_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/activities"
	shared_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/shared"
	"github.com/AdonisEnProvence/MusicRoom/random"
	"github.com/AdonisEnProvence/MusicRoom/shared"

	"github.com/bxcodec/faker/v3"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
	"go.temporal.io/sdk/temporal"
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

func (s *UnitTestSuite) getMtvState(userID string) shared_mtv.MtvRoomExposedState {
	var mtvState shared_mtv.MtvRoomExposedState

	res, err := s.env.QueryWorkflow(shared_mtv.MtvGetStateQuery, userID)
	s.NoError(err)

	err = res.Get(&mtvState)
	s.NoError(err)

	return mtvState
}

func (s *UnitTestSuite) getMtvRoomConstraintsDetails() shared_mtv.MtvRoomConstraintsDetails {
	var mtvConstraintsDetails shared_mtv.MtvRoomConstraintsDetails

	res, err := s.env.QueryWorkflow(shared_mtv.MtvGetRoomConstraintsDetails)
	s.NoError(err)

	err = res.Get(&mtvConstraintsDetails)
	s.NoError(err)

	return mtvConstraintsDetails
}

func (s *UnitTestSuite) getUsersList() []shared_mtv.ExposedInternalStateUserListElement {
	var usersList []shared_mtv.ExposedInternalStateUserListElement

	res, err := s.env.QueryWorkflow(shared_mtv.MtvGetUsersListQuery)
	s.NoError(err)

	err = res.Get(&usersList)
	s.NoError(err)

	return usersList
}

func (s *UnitTestSuite) emitUnkownSignal() {
	fmt.Println("-----EMIT UNKOWN SIGNAL CALLED IN TEST-----")
	unkownSignal := struct {
		Route shared.SignalRoute `validate:"required"`
	}{
		Route: "UnknownOperation",
	}

	s.env.SignalWorkflow(shared_mtv.SignalChannelName, unkownSignal)
}

func (s *UnitTestSuite) emitPlaySignal(args shared_mtv.NewPlaySignalArgs) {
	fmt.Println("-----EMIT PLAY CALLED IN TEST-----")
	playSignal := shared_mtv.NewPlaySignal(args)
	s.env.SignalWorkflow(shared_mtv.SignalChannelName, playSignal)
}

func (s *UnitTestSuite) emitUpdateUserPositionPermissionSignal(args shared_mtv.NewUpdateUserFitsPositionConstraintSignalArgs) {
	fmt.Println("-----EMIT UPDATE POSITION CALLED IN TEST-----")
	updatePositionSignal := shared_mtv.NewUpdateUserFitsPositionConstraintSignal(args)
	s.env.SignalWorkflow(shared_mtv.SignalChannelName, updatePositionSignal)
}

func (s *UnitTestSuite) emitUpdateDelegationOwnerSignal(args shared_mtv.NewUpdateDelegationOwnerSignalArgs) {
	fmt.Println("-----EMIT UPDATE DELEGATION OWNER CALLED IN TEST-----")
	updateDelegationOwnerSignal := shared_mtv.NewUpdateDelegationOwnerSignal(args)
	s.env.SignalWorkflow(shared_mtv.SignalChannelName, updateDelegationOwnerSignal)
}

func (s *UnitTestSuite) emitUpdateControlAndDelegationPermissionSignal(args shared_mtv.NewUpdateControlAndDelegationPermissionSignalArgs) {
	fmt.Println("-----EMIT UPDATE CONTROL AND DELEGATION PERMISSION CALLED IN TEST-----")
	updateDelegationOwnerSignal := shared_mtv.NewUpdateControlAndDelegationPermissionSignal(args)
	s.env.SignalWorkflow(shared_mtv.SignalChannelName, updateDelegationOwnerSignal)
}

func (s *UnitTestSuite) emitSuggestTrackSignal(args shared_mtv.SuggestTracksSignalArgs) {
	fmt.Println("-----EMIT SUGGEST TRACK CALLED IN TEST-----")
	suggestTracksSignal := shared_mtv.NewSuggestTracksSignal(args)

	s.env.SignalWorkflow(shared_mtv.SignalChannelName, suggestTracksSignal)
}

func (s *UnitTestSuite) emitVoteSignal(args shared_mtv.NewVoteForTrackSignalArgs) {
	fmt.Println("-----EMIT VOTE TRACK CALLED IN TEST-----")
	voteForTrackSignal := shared_mtv.NewVoteForTrackSignal(args)

	s.env.SignalWorkflow(shared_mtv.SignalChannelName, voteForTrackSignal)
}

func (s *UnitTestSuite) emitJoinSignal(args shared_mtv.NewJoinSignalArgs) {
	fmt.Println("-----EMIT JOIN CALLED IN TEST-----")
	signal := shared_mtv.NewJoinSignal(shared_mtv.NewJoinSignalArgs{
		UserID:             args.UserID,
		DeviceID:           args.DeviceID,
		UserHasBeenInvited: args.UserHasBeenInvited,
	})

	s.env.SignalWorkflow(shared_mtv.SignalChannelName, signal)
}

func (s *UnitTestSuite) emitLeaveSignal(userID string) {
	fmt.Println("-----EMIT LEAVE CALLED IN TEST-----")
	signal := shared_mtv.NewLeaveSignal(shared_mtv.NewLeaveSignalArgs{
		UserID: userID,
	})

	s.env.SignalWorkflow(shared_mtv.SignalChannelName, signal)
}

func (s *UnitTestSuite) emitTerminateWorkflowSignal() {
	fmt.Println("-----EMIT TERMINATE CALLED IN TEST-----")
	signal := shared_mtv.NewTerminateSignal(shared_mtv.NewTerminateSignalArgs{})

	s.env.SignalWorkflow(shared_mtv.SignalChannelName, signal)
}

func (s *UnitTestSuite) emitChangeUserEmittingDevice(userID string, deviceID string) {
	fmt.Println("-----EMIT CHANGE USER EMITTING DEVICE CALLED IN TEST-----")
	signal := shared_mtv.NewChangeUserEmittingDeviceSignal(shared_mtv.ChangeUserEmittingDeviceSignalArgs{
		UserID:   userID,
		DeviceID: deviceID,
	})

	s.env.SignalWorkflow(shared_mtv.SignalChannelName, signal)
}

func (s *UnitTestSuite) mockOnceSuggest(userID string, deviceID string, roomID string, tracks []shared.TrackMetadata) {
	var a *activities_mtv.Activities

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
		a.AcknowledgeTracksSuggestion,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
}

func (s *UnitTestSuite) emitPauseSignal(args shared_mtv.NewPauseSignalArgs) {
	fmt.Println("-----EMIT PAUSED CALLED IN TEST-----")
	pauseSignal := shared_mtv.NewPauseSignal(args)

	s.env.SignalWorkflow(shared_mtv.SignalChannelName, pauseSignal)
}

func (s *UnitTestSuite) emitGoToNextTrackSignal(args shared_mtv.NewGoToNextTrackSignalArgs) {
	fmt.Println("-----EMIT GO TO NEXT TRACK IN TEST-----")
	goToNextTrackSignal := shared_mtv.NewGoToNexTrackSignal(args)

	s.env.SignalWorkflow(shared_mtv.SignalChannelName, goToNextTrackSignal)
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

func getWorkflowInitParams(tracksIDs []string, minimumScoreToBePlayed int) (shared_mtv.MtvRoomParameters, string) {
	var (
		workflowID          = faker.UUIDHyphenated()
		roomCreatorUserID   = faker.UUIDHyphenated()
		roomCreatorDeviceID = faker.UUIDHyphenated()
	)

	creatorUserRelatedInformation := &shared_mtv.InternalStateUser{
		UserID:                            roomCreatorUserID,
		DeviceID:                          roomCreatorDeviceID,
		TracksVotedFor:                    make([]string, 0),
		HasControlAndDelegationPermission: true,
	}

	return shared_mtv.MtvRoomParameters{
		RoomID:                        workflowID,
		RoomCreatorUserID:             roomCreatorUserID,
		RoomName:                      faker.Word(),
		CreatorUserRelatedInformation: creatorUserRelatedInformation,
		InitialTracksIDsList:          tracksIDs,
		MinimumScoreToBePlayed:        minimumScoreToBePlayed,
		HasPhysicalAndTimeConstraints: false,
		PhysicalAndTimeConstraints:    nil,
		IsOpen:                        true,
		IsOpenOnlyInvitedUsersCanVote: false,
		PlayingMode:                   shared_mtv.MtvPlayingModeBroadcast,
	}, roomCreatorDeviceID
}

// Test_PlayThenPauseTrack scenario:
// TODO redict the scenario
func (s *UnitTestSuite) Test_PlayThenPauseTrack() {
	var a *activities_mtv.Activities
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
	params, _ := getWorkflowInitParams(tracksIDs, 1)

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(3)
	s.env.OnActivity(
		a.PauseActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(3)

	checkThatRoomIsNotPlaying := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)
		s.False(mtvState.Playing)

		s.emitPlaySignal(shared_mtv.NewPlaySignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, checkThatRoomIsNotPlaying)

	emitPause := firstTrackDurationFirstThird
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)
		s.True(mtvState.Playing)
		s.emitPauseSignal(shared_mtv.NewPauseSignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, emitPause)

	checkThatOneThirdFirstTrackElapsed := defaultDuration
	registerDelayedCallbackWrapper(func() {
		fmt.Println("*********VERIFICATION FIRST THIRD TIER ELAPSED*********")
		expectedExposedCurrentTrack := shared_mtv.ExposedCurrentTrack{
			CurrentTrack: shared_mtv.CurrentTrack{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)
		fmt.Printf("We should find the first third elapsed for the first track\n%+v\n", mtvState.CurrentTrack)

		s.False(mtvState.Playing)
		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)

	}, checkThatOneThirdFirstTrackElapsed)

	secondEmitPlaySignal := defaultDuration
	//Play alone because the signal is sent as last from registerDelayedCallback
	registerDelayedCallbackWrapper(func() {
		fmt.Println("*********VERIFICATION 3/3 first track*********")
		s.emitPlaySignal(shared_mtv.NewPlaySignalArgs{
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
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)
		fmt.Printf("We should find the second track with an elapsed at 0\n%+v\n", mtvState.CurrentTrack)

		expectedExposedCurrentTrack := shared_mtv.ExposedCurrentTrack{
			CurrentTrack: shared_mtv.CurrentTrack{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)
		fmt.Printf("We should find the second track with an elapsed at half second track total duration\n%+v\n", mtvState.CurrentTrack)

		expectedExposedCurrentTrack := shared_mtv.ExposedCurrentTrack{
			CurrentTrack: shared_mtv.CurrentTrack{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)
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
		a *activities_mtv.Activities

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
	params, _ := getWorkflowInitParams(tracksIDs, 1)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.JoinActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)
	s.env.OnActivity(
		a.UserLengthUpdateActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)

	checkOnlyOneUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		s.Empty(mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(1, mtvState.UsersLength)
	}, checkOnlyOneUser)

	secondUserJoins := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           fakeDeviceID,
			UserID:             fakeUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, secondUserJoins)

	shouldNotBeRegisterDeviceID := faker.UUIDHyphenated()
	tryDuplicateOrOverrrideTheUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           shouldNotBeRegisterDeviceID,
			UserID:             fakeUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, tryDuplicateOrOverrrideTheUser)

	emptyDeviceID := defaultDuration
	randomUserID := faker.UUIDHyphenated()
	registerDelayedCallbackWrapper(func() {
		args := shared_mtv.NewJoinSignalArgs{
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
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           randomDeviceID,
			UserID:             "",
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emptyUserID)

	checkForEmptyUserIDInfo := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		s.Equal(2, mtvState.UsersLength)
		s.Empty(mtvState.UserRelatedInformation)
	}, checkForEmptyUserIDInfo)

	checkTwoUsersThenEmitPlay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(fakeUserID)

		s.Equal(2, mtvState.UsersLength)
		expectedInternalStateUser := &shared_mtv.InternalStateUser{
			UserID:                            fakeUserID,
			DeviceID:                          fakeDeviceID,
			TracksVotedFor:                    make([]string, 0),
			HasControlAndDelegationPermission: false,
		}

		s.NotEqual(shouldNotBeRegisterDeviceID, mtvState.UserRelatedInformation.DeviceID)
		s.Equal(expectedInternalStateUser, mtvState.UserRelatedInformation)
		s.emitPlaySignal(shared_mtv.NewPlaySignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, checkTwoUsersThenEmitPlay)

	emitPauseSignal := firstTrackDuration - 200*defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		expectedExposedCurrentTrack := shared_mtv.ExposedCurrentTrack{
			CurrentTrack: shared_mtv.CurrentTrack{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 2)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.ChangeUserEmittingDeviceActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.JoinActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	checkCreateUserRelatedInformation := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedInternalStateUser := &shared_mtv.InternalStateUser{
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
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		s.Equal(1, mtvState.UsersLength)
		s.False(mtvState.Playing)
		s.Empty(mtvState.UserRelatedInformation)
	}, checkEmptyUserIDRelatedInformation)

	emitJoin := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           fakeDeviceID,
			UserID:             fakeUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoin)

	checkLatestUserRelatedInformation := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(fakeUserID)

		expectedInternalStateUser := &shared_mtv.InternalStateUser{
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

		expectedInternalStateUser := &shared_mtv.InternalStateUser{
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

		expectedInternalStateUser := &shared_mtv.InternalStateUser{
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
		a *activities_mtv.Activities

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
	params, _ := getWorkflowInitParams(tracksIDs, 1)

	// secondTrackDuration := tracks[1].Duration
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.PauseActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)

	// 1. We expect the room to be paused by default.
	initialStateQueryDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		s.False(mtvState.Playing)
	}, initialStateQueryDelay)

	// 2. Send the first GoToNextTrack signal.
	firstGoToNextTrackSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitGoToNextTrackSignal(shared_mtv.NewGoToNextTrackSignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, firstGoToNextTrackSignal)

	// 3. We expect the second initial track to be the current one
	// and the room to be playing.
	verifyThatGoNextTrackWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		s.True(mtvState.Playing)
		expectedExposedCurrentTrack := shared_mtv.ExposedCurrentTrack{
			CurrentTrack: shared_mtv.CurrentTrack{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		s.emitGoToNextTrackSignal(shared_mtv.NewGoToNextTrackSignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, secondGoToNextTrackSignal)

	// 5. We expect the second initial track to still be the current one playing one
	// after we tried to go to the next track.
	verifyThatGoToNextTrackDidntWork := defaultDuration * 200
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		s.True(mtvState.Playing)

		expectedExposedCurrentTrack := shared_mtv.ExposedCurrentTrack{
			CurrentTrack: shared_mtv.CurrentTrack{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		a *activities_mtv.Activities

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
	params, _ := getWorkflowInitParams(tracksIDs, 1)

	// secondTrackDuration := tracks[1].Duration
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		mock.Anything,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.UserLengthUpdateActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)
	s.env.OnActivity(
		a.LeaveActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	// 1. We expect the room to be paused by default and contains one user (the creator).
	initialStateQueryDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		s.False(mtvState.Playing)
		s.Equal(1, mtvState.UsersLength)
	}, initialStateQueryDelay)

	// 2. We send a join signal for a user
	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           faker.UUIDHyphenated(),
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	// 3. check user joined
	checkUserJoined := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

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
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

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
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		s.Equal(1, mtvState.UsersLength)
	}, checkItDidntWork)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_PlayActivityIsNotCalledWhenTryingToPlayTheLastTrackThatEnded() {
	var a *activities_mtv.Activities

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
	params, _ := getWorkflowInitParams(tracksIDs, 1)

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()
	defaultDuration := 1 * time.Millisecond

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(1)
	s.env.OnActivity(
		a.PauseActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)

	initialStateQueryDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		s.False(mtvState.Playing)
		s.emitPlaySignal(shared_mtv.NewPlaySignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, initialStateQueryDelay)

	secondStateQueryAfterTotalTrackDuration := firstTrackDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		expectedExposedCurrentTrack := shared_mtv.ExposedCurrentTrack{
			CurrentTrack: shared_mtv.CurrentTrack{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		s.emitPlaySignal(shared_mtv.NewPlaySignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, secondPlaySignalDelay)

	thirdStateQueryAfterSecondPlaySignal := firstTrackDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		expectedExposedCurrentTrack := shared_mtv.ExposedCurrentTrack{
			CurrentTrack: shared_mtv.CurrentTrack{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
	var a *activities_mtv.Activities

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
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.NotifySuggestOrVoteUpdateActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.AcknowledgeTracksSuggestion,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)
	s.env.OnActivity(
		a.AcknowledgeTracksSuggestionFail,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	params, _ := getWorkflowInitParams(tracksIDs, 1)

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()
	defaultDuration := 1 * time.Millisecond

	defer resetMock()

	joinSuggesterUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           suggesterDeviceID,
			UserID:             suggesterUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, joinSuggesterUser)

	firstSuggestTracksSignalDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared_mtv.SuggestTracksSignalArgs{
			TracksToSuggest: tracksIDsToSuggest,
			UserID:          suggesterUserID,
			DeviceID:        suggesterDeviceID,
		})
	}, firstSuggestTracksSignalDelay)

	assertSuggestedTracksHaveBeenAcceptedDelay := defaultDuration * 20
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		expectedMtvStateTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		s.emitSuggestTrackSignal(shared_mtv.SuggestTracksSignalArgs{
			TracksToSuggest: []string{tracksToSuggestMetadata[0].ID},
			UserID:          suggesterUserID,
			DeviceID:        suggesterDeviceID,
		})
	}, secondSuggestTracksSignalDelay)

	assertDuplicateSuggestedTrackHasNotBeenAcceptedDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		expectedMtvStateTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		s.emitSuggestTrackSignal(shared_mtv.SuggestTracksSignalArgs{
			TracksToSuggest: []string{tracks[1].ID},
			UserID:          suggesterUserID,
			DeviceID:        suggesterDeviceID,
		})
	}, thirdSuggestTracksSignalDelay)

	assertDuplicateFromTracksListSuggestedTrackHasNotBeenAcceptedDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		expectedMtvStateTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
	var a *activities_mtv.Activities

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
	tracksExposedMetadata := []shared_mtv.TrackMetadataWithScoreWithDuration{
		{
			TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
			TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
	firstTracksToSuggestExposedMetadata := []shared_mtv.TrackMetadataWithScoreWithDuration{
		{
			TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
			TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
	secondTracksToSuggestExposedMetadata := []shared_mtv.TrackMetadataWithScoreWithDuration{
		{
			TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
			TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
	params, _ := getWorkflowInitParams(tracksIDs, 1)

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
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.NotifySuggestOrVoteUpdateActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)
	s.env.OnActivity(
		a.AcknowledgeTracksSuggestion,
		mock.Anything,
		mock.Anything,
	).Return(nil).Twice()

	joinSuggesterUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           suggesterDeviceID,
			UserID:             suggesterUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, joinSuggesterUser)

	firstSuggestTracksSignalDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared_mtv.SuggestTracksSignalArgs{
			TracksToSuggest: firstTracksIDsToSuggest,
			UserID:          suggesterUserID,
			DeviceID:        suggesterDeviceID,
		})
	}, firstSuggestTracksSignalDelay)

	secondSuggestTracksSignalDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared_mtv.SuggestTracksSignalArgs{
			TracksToSuggest: secondTracksIDsToSuggest,
			UserID:          suggesterUserID,
			DeviceID:        suggesterDeviceID,
		})
	}, secondSuggestTracksSignalDelay)

	assertSecondSuggestedTrackHasBeenAcceptedDelay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)
		initialTrackAndSecondTracksToSuggest := append([]shared_mtv.TrackMetadataWithScoreWithDuration{}, tracksExposedMetadata[1])
		initialTrackAndSecondTracksToSuggest = append(initialTrackAndSecondTracksToSuggest, secondTracksToSuggestExposedMetadata...)

		s.Len(mtvState.Tracks, 3)
		s.Equal(initialTrackAndSecondTracksToSuggest, mtvState.Tracks)
	}, assertSecondSuggestedTrackHasBeenAcceptedDelay)

	assertAllSuggestedTracksHaveBeenAcceptedAfterEveryFetchingHasEndedDelay := 15 * time.Second
	registerDelayedCallbackWrapper(func() {
		allSuggestedTracks := append([]shared_mtv.TrackMetadataWithScoreWithDuration{}, tracksExposedMetadata[1])
		allSuggestedTracks = append(allSuggestedTracks, secondTracksToSuggestExposedMetadata...)
		allSuggestedTracks = append(allSuggestedTracks, firstTracksToSuggestExposedMetadata...)

		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

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
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 1)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.JoinActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.UserVoteForTrackAcknowledgement,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.NotifySuggestOrVoteUpdateActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(1)
	s.env.OnActivity(
		a.AcknowledgeTracksSuggestionFail,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(1)

	//Verify that creator has voted for the initialTracks and that he cannot vote or vote by suggest again
	checkCreatorTracksVotedFor := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
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
		s.emitSuggestTrackSignal(shared_mtv.SuggestTracksSignalArgs{
			TracksToSuggest: tracksIDs,
			UserID:          params.RoomCreatorUserID,
			DeviceID:        creatorDeviceID,
		})
	}, emitSuggestForAnInitialTrack)

	checkForSuggestFails := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expected := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	checkJoinSuccess := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

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
		s.emitSuggestTrackSignal(shared_mtv.SuggestTracksSignalArgs{
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

		expected := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		s.emitVoteSignal(shared_mtv.NewVoteForTrackSignalArgs{
			UserID:  params.RoomCreatorUserID,
			TrackID: tracks[1].ID,
		})
	}, emitVoteForCreatorForAlreadyVoted)

	alsoEmitVoteForUnkownUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared_mtv.NewVoteForTrackSignalArgs{
			UserID:  fakeUserID,
			TrackID: tracks[1].ID,
		})
	}, alsoEmitVoteForUnkownUser)

	alsoEmitVoteForUnkownTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared_mtv.NewVoteForTrackSignalArgs{
			UserID:  params.RoomCreatorUserID,
			TrackID: faker.UUIDHyphenated(),
		})
	}, alsoEmitVoteForUnkownTrack)

	checkNothingHappened := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		expected := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		s.emitVoteSignal(shared_mtv.NewVoteForTrackSignalArgs{
			TrackID: tracksToSuggest[1].ID,
			UserID:  params.RoomCreatorUserID,
		})
	}, emitVoteForCreatorForNotVotedTrack)

	checkVoteCounted := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		expected := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		s.emitGoToNextTrackSignal(shared_mtv.NewGoToNextTrackSignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, emitGoToNextTrackSignal)

	previousCurrentTrackToSuggest := []shared.TrackMetadata{
		tracks[0],
	}
	emitSuggestForPastCurrentTrack := defaultDuration
	s.mockOnceSuggest(params.RoomCreatorUserID, creatorDeviceID, params.RoomID, previousCurrentTrackToSuggest)

	registerDelayedCallbackWrapper(func() {

		s.emitSuggestTrackSignal(shared_mtv.SuggestTracksSignalArgs{
			TracksToSuggest: []string{
				previousCurrentTrackToSuggest[0].ID,
			},
			UserID:   params.RoomCreatorUserID,
			DeviceID: creatorDeviceID,
		})
	}, emitSuggestForPastCurrentTrack)

	checkThatCreatorCouldSuggestAndVoteForPreviousCurrentTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		expectedCurrentTrackID := tracks[1].ID

		expected := []shared_mtv.TrackMetadataWithScoreWithDuration{

			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 2)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
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
		s.emitGoToNextTrackSignal(shared_mtv.NewGoToNextTrackSignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, emitGoToNextTrack)

	checkNothingHappened := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)
		expectedCreator := &shared_mtv.InternalStateUser{
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
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	joiningUserVoteForTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared_mtv.NewVoteForTrackSignalArgs{
			TrackID: tracksIDs[2],
			UserID:  joiningUserID,
		})
	}, joiningUserVoteForTrack)

	//Here we test the auto play after a track from not ready to be played
	//one finally get the required score amount
	checkJoinAndVoteWorkedAlsoRoomIsPlaying := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUserRelatedInformation := &shared_mtv.InternalStateUser{
			UserID:                            joiningUserID,
			DeviceID:                          joiningDeviceID,
			TracksVotedFor:                    []string{},
			HasControlAndDelegationPermission: false,
		}

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{

			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 1)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
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
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	joiningUserVoteForTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared_mtv.NewVoteForTrackSignalArgs{
			TrackID: tracksIDs[2],
			UserID:  joiningUserID,
		})
	}, joiningUserVoteForTrack)

	checkJoinAndVoteWorkedAlsoRoomIsNotPlaying := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUserRelatedInformation := &shared_mtv.InternalStateUser{
			UserID:   joiningUserID,
			DeviceID: joiningDeviceID,
			TracksVotedFor: []string{
				tracksIDs[2],
			},
			HasControlAndDelegationPermission: false,
		}

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 2)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
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
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	joiningUserVoteForTrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitVoteSignal(shared_mtv.NewVoteForTrackSignalArgs{
			TrackID: tracksIDs[0],
			UserID:  joiningUserID,
		})
	}, joiningUserVoteForTrack)

	checkJoinAndVoteWorkedAlsoRoomIsPlaying := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUserRelatedInformation := &shared_mtv.InternalStateUser{
			UserID:                            joiningUserID,
			DeviceID:                          joiningDeviceID,
			TracksVotedFor:                    []string{},
			HasControlAndDelegationPermission: false,
		}

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{}

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

		expectedExposedCurrentTrack := &shared_mtv.ExposedCurrentTrack{
			CurrentTrack: shared_mtv.CurrentTrack{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		s.emitSuggestTrackSignal(shared_mtv.SuggestTracksSignalArgs{
			DeviceID:        creatorDeviceID,
			UserID:          params.RoomCreatorUserID,
			TracksToSuggest: []string{trackToSuggest.ID},
		})
	}, creatorSuggestSong)

	s.mockOnceSuggest(params.RoomCreatorUserID, creatorDeviceID, params.RoomID, []shared.TrackMetadata{trackToSuggest})
	checkSuggestWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		s.emitVoteSignal(shared_mtv.NewVoteForTrackSignalArgs{
			TrackID: trackToSuggest.ID,
			UserID:  joiningUserID,
		})
	}, joiningUserVoteForSuggestedTrack)

	checkThatRoomAutoPlayed := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUser := &shared_mtv.InternalStateUser{
			UserID:                            joiningUserID,
			DeviceID:                          joiningDeviceID,
			TracksVotedFor:                    []string{},
			HasControlAndDelegationPermission: false,
		}

		expectedExposedCurrentTrack := &shared_mtv.ExposedCurrentTrack{
			CurrentTrack: shared_mtv.CurrentTrack{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{}

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
	var a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	start := time.Now()

	end := start.Add(defaultDuration * 5000)

	physicalAndTimeConstraints := shared_mtv.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared_mtv.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   end,
		PhysicalConstraintStartsAt: start,
	}

	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.CreatorUserRelatedInformation.UserFitsPositionConstraint = &falseValue

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.AcknowledgeUpdateUserFitsPositionConstraint,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)
		fmt.Printf("\n STATE =\n%+v\n", mtvState)
		expectedCreator := &shared_mtv.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        &falseValue,
			HasControlAndDelegationPermission: true,
		}

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		s.Equal(expectedTracks, mtvState.Tracks) //here
		s.True(mtvState.RoomHasTimeAndPositionConstraints)
	}, init)

	updateCreatorAbilityToVoteForTime := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateUserPositionPermissionSignal(shared_mtv.NewUpdateUserFitsPositionConstraintSignalArgs{
			UserID:                     params.RoomCreatorUserID,
			UserFitsPositionConstraint: true,
		})
	}, updateCreatorAbilityToVoteForTime)

	checkPositionUpdateWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
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
		s.emitVoteSignal(shared_mtv.NewVoteForTrackSignalArgs{
			UserID:  params.RoomCreatorUserID,
			TrackID: tracks[0].ID,
		})
	}, voteForAnExistingTrack)

	checkVoteWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
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
	var a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	start := time.Now()

	end := start.Add(defaultDuration * 5000)

	physicalAndTimeConstraints := shared_mtv.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared_mtv.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   end,
		PhysicalConstraintStartsAt: start,
	}

	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.CreatorUserRelatedInformation.UserFitsPositionConstraint = &falseValue

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        &falseValue,
			HasControlAndDelegationPermission: true,
		}

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		s.emitUpdateUserPositionPermissionSignal(shared_mtv.NewUpdateUserFitsPositionConstraintSignalArgs{
			UserID:                     params.RoomCreatorUserID,
			UserFitsPositionConstraint: true,
		})
	}, updateCreatorAbilityToVoteForTime)

	checkPositionUpdateWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
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
		s.emitVoteSignal(shared_mtv.NewVoteForTrackSignalArgs{
			UserID:  params.RoomCreatorUserID,
			TrackID: tracks[0].ID,
		})
	}, voteForAnExistingTrack)

	checkVoteDidntWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        &trueValue,
			HasControlAndDelegationPermission: true,
		}

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	params.PlayingMode = shared_mtv.MtvPlayingModeDirect
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.AcknowledgeUpdateDelegationOwner,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared_mtv.MtvPlayingModeDirect, mtvState.PlayingMode)
		s.Equal(&params.RoomCreatorUserID, mtvState.DelegationOwnerUserID)
	}, init)

	updateDelegationOwnerWithEmptyNewDelegationOwner := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared_mtv.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: "",
			EmitterUserID:            params.RoomCreatorUserID,
		})
	}, updateDelegationOwnerWithEmptyNewDelegationOwner)

	updateDelegationOwnerWithEmptyEmitter := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared_mtv.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: faker.UUIDHyphenated(),
			EmitterUserID:            "",
		})
	}, updateDelegationOwnerWithEmptyEmitter)

	updateDelegationOwnerWithNunExistingUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared_mtv.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: joiningUserID,
			EmitterUserID:            params.RoomCreatorUserID,
		})
	}, updateDelegationOwnerWithNunExistingUser)

	checkNothingWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared_mtv.MtvPlayingModeDirect, mtvState.PlayingMode)
		s.Equal(&params.RoomCreatorUserID, mtvState.DelegationOwnerUserID)
	}, checkNothingWorked)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	updateDelegationOwnerWithExistingUserWithoutPermissions := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared_mtv.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: joiningUserID,
			EmitterUserID:            joiningUserID,
		})
	}, updateDelegationOwnerWithExistingUserWithoutPermissions)

	checkNothingWorked = defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)
		expectedCreator := &shared_mtv.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}

		s.Equal(2, mtvState.UsersLength)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared_mtv.MtvPlayingModeDirect, mtvState.PlayingMode)
		s.Equal(&params.RoomCreatorUserID, mtvState.DelegationOwnerUserID)
	}, checkNothingWorked)

	updateDelegationOwner := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared_mtv.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: joiningUserID,
			EmitterUserID:            params.RoomCreatorUserID,
		})
	}, updateDelegationOwner)

	checkItWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)
		expectedCreator := &shared_mtv.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}

		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared_mtv.MtvPlayingModeDirect, mtvState.PlayingMode)
		s.Equal(&joiningUserID, mtvState.DelegationOwnerUserID)
	}, checkItWorked)

	delegationOwnerLeaveRoom := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitLeaveSignal(joiningUserID)
	}, delegationOwnerLeaveRoom)

	checkDelegationOwnerReset := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)
		expectedCreator := &shared_mtv.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}

		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared_mtv.MtvPlayingModeDirect, mtvState.PlayingMode)
		s.Equal(params.RoomCreatorUserID, *mtvState.DelegationOwnerUserID)
	}, checkDelegationOwnerReset)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_CreateBroadcastRoomAndAttemptToExecuteDelegationOperation() {
	var (
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	params.PlayingMode = shared_mtv.MtvPlayingModeBroadcast
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.AcknowledgeUpdateDelegationOwner,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}

		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared_mtv.MtvPlayingModeBroadcast, mtvState.PlayingMode)
		s.Nil(mtvState.DelegationOwnerUserID)
	}, init)

	emitJoinSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	updateDelegationOwner := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared_mtv.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: joiningUserID,
			EmitterUserID:            params.RoomCreatorUserID,
		})
	}, updateDelegationOwner)

	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
		}

		s.Equal(2, mtvState.UsersLength)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.False(mtvState.Playing)
		s.Equal(shared_mtv.MtvPlayingModeBroadcast, mtvState.PlayingMode)
		s.Nil(mtvState.DelegationOwnerUserID)
	}, init)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_CanUpdateControlAndDelegationPermission() {
	var (
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.AcknowledgeUpdateControlAndDelegationPermission,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
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
		args := shared_mtv.NewJoinSignalArgs{
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
		s.emitUpdateControlAndDelegationPermissionSignal(shared_mtv.NewUpdateControlAndDelegationPermissionSignalArgs{
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
		a *activities_mtv.Activities

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
	params, _ := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	params.PlayingMode = shared_mtv.MtvPlayingModeBroadcast
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		usersList := s.getUsersList()

		expectedUsersList := []shared_mtv.ExposedInternalStateUserListElement{
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
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		usersList := s.getUsersList()

		expectedUsersList := []shared_mtv.ExposedInternalStateUserListElement{
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
		a *activities_mtv.Activities

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
	params, _ := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	params.PlayingMode = shared_mtv.MtvPlayingModeDirect
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.AcknowledgeUpdateDelegationOwner,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		usersList := s.getUsersList()

		expectedUsersList := []shared_mtv.ExposedInternalStateUserListElement{
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
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	updateDelegationOwner := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateDelegationOwnerSignal(shared_mtv.NewUpdateDelegationOwnerSignalArgs{
			NewDelegationOwnerUserID: joiningUserID,
			EmitterUserID:            params.RoomCreatorUserID,
		})
	}, updateDelegationOwner)

	checkOperationsWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		usersList := s.getUsersList()

		expectedUsersList := []shared_mtv.ExposedInternalStateUserListElement{
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

		expectedUsersList := []shared_mtv.ExposedInternalStateUserListElement{
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
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	params.PlayingMode = shared_mtv.MtvPlayingModeDirect
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
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
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUser := &shared_mtv.InternalStateUser{
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
		s.emitPlaySignal(shared_mtv.NewPlaySignalArgs{
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
		s.emitUpdateControlAndDelegationPermissionSignal(shared_mtv.NewUpdateControlAndDelegationPermissionSignalArgs{
			HasControlAndDelegationPermission: true,
			ToUpdateUserID:                    joiningUserID,
		})
	}, emitUpdateUserControlAndDelegationPermission)

	secondEmitPlaySignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitPlaySignal(shared_mtv.NewPlaySignalArgs{
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
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	params.PlayingMode = shared_mtv.MtvPlayingModeDirect
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	//First call after initial tracks fetch
	//Second call after Custom emit pause signal
	s.env.OnActivity(
		a.PauseActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
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
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUser := &shared_mtv.InternalStateUser{
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
		s.emitPlaySignal(shared_mtv.NewPlaySignalArgs{
			UserID: params.RoomCreatorUserID,
		})
	}, emitPlaySignal)

	checkPlayWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		s.True(mtvState.Playing)
	}, checkPlayWorked)

	emitPauseSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitPlaySignal(shared_mtv.NewPlaySignalArgs{
			UserID: joiningUserID,
		})
	}, emitPauseSignal)

	checkPauseFailed := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		s.True(mtvState.Playing)
	}, checkPauseFailed)

	emitUpdateUserControlAndDelegationPermission := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUpdateControlAndDelegationPermissionSignal(shared_mtv.NewUpdateControlAndDelegationPermissionSignalArgs{
			HasControlAndDelegationPermission: true,
			ToUpdateUserID:                    joiningUserID,
		})
	}, emitUpdateUserControlAndDelegationPermission)

	secondEmitPauseSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitPauseSignal(shared_mtv.NewPauseSignalArgs{
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
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		expectedCreator := &shared_mtv.InternalStateUser{
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
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignal)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedJoiningUser := &shared_mtv.InternalStateUser{
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
		s.emitGoToNextTrackSignal(shared_mtv.NewGoToNextTrackSignalArgs{
			UserID: joiningUserID,
		})
	}, emitGoToNextTrackSignal)

	checkGoToNextTrackFailed := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(shared_mtv.NoRelatedUserID)

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		s.emitUpdateControlAndDelegationPermissionSignal(shared_mtv.NewUpdateControlAndDelegationPermissionSignalArgs{
			HasControlAndDelegationPermission: true,
			ToUpdateUserID:                    joiningUserID,
		})
	}, emitUpdateUserControlAndDelegationPermission)

	secondEmitGoToNextTrackSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitGoToNextTrackSignal(shared_mtv.NewGoToNextTrackSignalArgs{
			UserID: joiningUserID,
		})
	}, secondEmitGoToNextTrackSignal)

	checkEmitGoToNextTrackWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{}

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
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 1)
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
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		//TracksVotedFor with 1 element shows that creator even with UserHasBeenInvited to false can still vote
		expectedCreator := &shared_mtv.InternalStateUser{
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
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignalForJoiningUser)

	emitJoinSignalForInvitedUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           invitedUserDeviceID,
			UserID:             invitedUserID,
			UserHasBeenInvited: true,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignalForInvitedUser)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(invitedUserID)

		expectedJoiningUser := &shared_mtv.InternalStateUser{
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
		args := shared_mtv.NewVoteForTrackSignalArgs{
			TrackID: tracksIDs[1],
			UserID:  joiningUserID,
		}
		s.emitVoteSignal(args)
	}, emitVoteForJoiningUser)

	checkDidntWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(joiningUserID)

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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

		expectedJoiningUser := &shared_mtv.InternalStateUser{
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
		args := shared_mtv.NewVoteForTrackSignalArgs{
			TrackID: tracksIDs[1],
			UserID:  invitedUserID,
		}
		s.emitVoteSignal(args)
	}, emitVoteForInvitedUser)

	checkWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(invitedUserID)

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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

		expectedInvitedUser := &shared_mtv.InternalStateUser{
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
		s.emitSuggestTrackSignal(shared_mtv.SuggestTracksSignalArgs{
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

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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

		expectedJoiningUser := &shared_mtv.InternalStateUser{
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
		s.emitSuggestTrackSignal(shared_mtv.SuggestTracksSignalArgs{
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

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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

		expectedInvitedUser := &shared_mtv.InternalStateUser{
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

func (s *UnitTestSuite) Test_SuggestOrVoteSentActivityBaseOnCurrentTrack() {
	var (
		a *activities_mtv.Activities

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
	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 2)
	defaultDuration := 1 * time.Millisecond

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		a.NotifySuggestOrVoteUpdateActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		//TracksVotedFor with 1 element shows that creator even with UserHasBeenInvited to false can still vote
		expectedCreator := &shared_mtv.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{tracksIDs[0]},
			UserFitsPositionConstraint:        nil,
			HasControlAndDelegationPermission: true,
			UserHasBeenInvited:                false,
		}

		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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

		var expectedExposedCurrentTrack *shared_mtv.ExposedCurrentTrack = nil

		s.False(mtvState.Playing)
		s.Nil(mtvState.TimeConstraintIsValid)
		s.Equal(expectedExposedCurrentTrack, mtvState.CurrentTrack)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.Equal(expectedTracks, mtvState.Tracks)
	}, init)

	//Emit join for joiningUser
	emitJoinSignalForJoiningUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared_mtv.NewJoinSignalArgs{
			DeviceID:           joiningUserDeviceID,
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		}
		s.emitJoinSignal(args)
	}, emitJoinSignalForJoiningUser)

	//Emit vote for track with joiningUser
	emitVoteForJoiningUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		args := shared_mtv.NewVoteForTrackSignalArgs{
			TrackID: tracksIDs[0],
			UserID:  joiningUserID,
		}
		s.emitVoteSignal(args)
	}, emitVoteForJoiningUser)

	waitForVoteOrSuggestInterval := shared_mtv.CheckForVoteUpdateIntervalDuration + defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)
		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{}

		expectedExposedCurrentTrack := &shared_mtv.ExposedCurrentTrack{
			CurrentTrack: shared_mtv.CurrentTrack{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
			Elapsed:  waitForVoteOrSuggestInterval.Milliseconds(),
		}

		s.True(mtvState.Playing)
		s.Equal(expectedExposedCurrentTrack, mtvState.CurrentTrack)
		s.Equal(expectedTracks, mtvState.Tracks)
	}, waitForVoteOrSuggestInterval)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_MtvRoomWithConstraintTimeIsValidStartBeforeNow() {
	var a *activities_mtv.Activities

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	defaultDuration := 1 * time.Millisecond
	tracksIDs := []string{tracks[0].ID}
	params, _ := getWorkflowInitParams(tracksIDs, 2)
	start := time.Now()

	end := start.Add(defaultDuration * 5000)

	physicalAndTimeConstraints := shared_mtv.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared_mtv.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   end,
		PhysicalConstraintStartsAt: start,
	}
	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.CreatorUserRelatedInformation.UserFitsPositionConstraint = &shared_mtv.TrueValue

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		a.AcknowledgeUpdateTimeConstraint,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		//TracksVotedFor with 1 element shows that creator even with UserHasBeenInvited to false can still vote
		s.NotNil(mtvState.TimeConstraintIsValid)
		s.True(*mtvState.TimeConstraintIsValid)
	}, init)

	checkTimeConstraintBecomesFalsy := defaultDuration * 5000
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		//TracksVotedFor with 1 element shows that creator even with UserHasBeenInvited to false can still vote
		s.NotNil(mtvState.TimeConstraintIsValid)
		s.False(*mtvState.TimeConstraintIsValid)
	}, checkTimeConstraintBecomesFalsy)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_MtvRoomWithConstraintTimeIsValidStartAfterNow() {
	var a *activities_mtv.Activities

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	defaultDuration := 1 * time.Millisecond
	tracksIDs := []string{tracks[0].ID}
	params, _ := getWorkflowInitParams(tracksIDs, 2)
	start := time.Now().Add(defaultDuration * 5000)

	end := start.Add(defaultDuration * 500)

	physicalAndTimeConstraints := shared_mtv.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared_mtv.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   end,
		PhysicalConstraintStartsAt: start,
	}
	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.CreatorUserRelatedInformation.UserFitsPositionConstraint = &shared_mtv.TrueValue

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		a.AcknowledgeUpdateTimeConstraint,
		mock.Anything,
		mock.Anything,
	).Return(nil).Twice()
	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		//TracksVotedFor with 1 element shows that creator even with UserHasBeenInvited to false can still vote
		s.NotNil(mtvState.TimeConstraintIsValid)
		s.False(*mtvState.TimeConstraintIsValid)
	}, init)

	checkTimeConstraintBecomesTruthy := defaultDuration * 5000
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		//TracksVotedFor with 1 element shows that creator even with UserHasBeenInvited to false can still vote
		s.NotNil(mtvState.TimeConstraintIsValid)
		s.True(*mtvState.TimeConstraintIsValid)
	}, checkTimeConstraintBecomesTruthy)

	checkTimeConstraintBecomesFalsy := defaultDuration * 5000
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(params.RoomCreatorUserID)

		//TracksVotedFor with 1 element shows that creator even with UserHasBeenInvited to false can still vote
		s.NotNil(mtvState.TimeConstraintIsValid)
		s.False(*mtvState.TimeConstraintIsValid)
	}, checkTimeConstraintBecomesFalsy)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_MtvRoomWithConstraintFailPhysicalAndTimeConstraintsNilButHasPhysicalAndTimeConstraintsTrue() {

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID}
	params, _ := getWorkflowInitParams(tracksIDs, 2)

	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = nil
	params.CreatorUserRelatedInformation.UserFitsPositionConstraint = &shared_mtv.TrueValue

	resetMock, _ := s.initTestEnv()

	defer resetMock()

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Error(err)
	var applicationErr *temporal.ApplicationError
	s.True(errors.As(err, &applicationErr))
	s.Equal("PhysicalAndTimeConstraints nil but HasPhysicalAndTimeConstraints true", applicationErr.Error())
}

func (s *UnitTestSuite) Test_MtvRoomWithConstraintFailPhysicalAndTimeConstraintsSetButHasPhysicalAndTimeConstraintsFalse() {

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	defaultDuration := 1 * time.Millisecond
	tracksIDs := []string{tracks[0].ID}
	params, _ := getWorkflowInitParams(tracksIDs, 2)
	start := time.Now().Add(defaultDuration * 5000)

	end := start.Add(defaultDuration * 500)

	physicalAndTimeConstraints := shared_mtv.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared_mtv.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   end,
		PhysicalConstraintStartsAt: start,
	}
	params.HasPhysicalAndTimeConstraints = false
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.CreatorUserRelatedInformation.UserFitsPositionConstraint = &shared_mtv.TrueValue

	resetMock, _ := s.initTestEnv()

	defer resetMock()

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Error(err)
	var applicationErr *temporal.ApplicationError
	s.True(errors.As(err, &applicationErr))
	s.Equal("PhysicalAndTimeConstraints set but HasPhysicalAndTimeConstraints false", applicationErr.Error())
}

func (s *UnitTestSuite) Test_MtvRoomWithConstraintFailStartIsAfterEnd() {

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	defaultDuration := 1 * time.Millisecond
	tracksIDs := []string{tracks[0].ID}
	params, _ := getWorkflowInitParams(tracksIDs, 2)
	start := time.Now().Add(defaultDuration * 5000)

	end := start.Add(defaultDuration * 500)

	physicalAndTimeConstraints := shared_mtv.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared_mtv.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   start,
		PhysicalConstraintStartsAt: end,
	}
	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.CreatorUserRelatedInformation.UserFitsPositionConstraint = &shared_mtv.TrueValue

	resetMock, _ := s.initTestEnv()

	defer resetMock()

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Error(err)
	var applicationErr *temporal.ApplicationError
	s.True(errors.As(err, &applicationErr))
	s.Equal("start is after end", applicationErr.Error())
}

func (s *UnitTestSuite) Test_MtvRoomWithConstraintFailStartEqualEnd() {

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	defaultDuration := 1 * time.Millisecond
	tracksIDs := []string{tracks[0].ID}
	params, _ := getWorkflowInitParams(tracksIDs, 2)
	start := time.Now().Add(defaultDuration * 5000)

	end := start.Add(defaultDuration * 500)

	physicalAndTimeConstraints := shared_mtv.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared_mtv.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   end,
		PhysicalConstraintStartsAt: end,
	}
	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.CreatorUserRelatedInformation.UserFitsPositionConstraint = &shared_mtv.TrueValue

	resetMock, _ := s.initTestEnv()

	defer resetMock()

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Error(err)
	var applicationErr *temporal.ApplicationError
	s.True(errors.As(err, &applicationErr))
	s.Equal("start equal end", applicationErr.Error())
}

func (s *UnitTestSuite) Test_MtvRoomWithConstraintFailEndIsBeforeNow() {

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID}
	params, _ := getWorkflowInitParams(tracksIDs, 2)
	now := time.Now()
	start := now.Add(time.Duration(-2) * time.Minute)

	end := now.Add(time.Duration(-1) * time.Minute)
	physicalAndTimeConstraints := shared_mtv.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared_mtv.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   end,
		PhysicalConstraintStartsAt: start,
	}
	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.CreatorUserRelatedInformation.UserFitsPositionConstraint = &shared_mtv.TrueValue

	resetMock, _ := s.initTestEnv()

	defer resetMock()

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Error(err)
	var applicationErr *temporal.ApplicationError
	s.True(errors.As(err, &applicationErr))
	s.Equal("end is before now", applicationErr.Error())
}

func (s *UnitTestSuite) Test_MtvRoomWithConstraintFailEndEqualNow() {

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID}
	params, _ := getWorkflowInitParams(tracksIDs, 2)
	//mocking now
	resetMock, _ := s.initTestEnv()
	///

	now := TimeWrapper()
	start := now.Add(time.Duration(-2) * time.Minute)
	physicalAndTimeConstraints := shared_mtv.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared_mtv.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   now,
		PhysicalConstraintStartsAt: start,
	}
	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.CreatorUserRelatedInformation.UserFitsPositionConstraint = &shared_mtv.TrueValue

	defer resetMock()

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Error(err)
	var applicationErr *temporal.ApplicationError
	s.True(errors.As(err, &applicationErr))
	s.Equal("end equal now", applicationErr.Error())

}

func (s *UnitTestSuite) Test_MtvRoomFailPlayingModeIsInvalid() {

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID}
	params, _ := getWorkflowInitParams(tracksIDs, 2)
	//mocking now
	resetMock, _ := s.initTestEnv()
	///
	params.PlayingMode = "UNKNOWN_PLAYING_MODE"

	defer resetMock()

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Error(err)
	var applicationErr *temporal.ApplicationError
	s.True(errors.As(err, &applicationErr))
	s.Equal("PlayingMode is invalid", applicationErr.Error())
}

func (s *UnitTestSuite) Test_MtvRoomFailIsOpenOnlyInvitedUsersCanVoteTrueButIsOpenFalse() {

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID}
	params, _ := getWorkflowInitParams(tracksIDs, 2)
	//mocking now
	resetMock, _ := s.initTestEnv()
	///
	params.IsOpen = false
	params.IsOpenOnlyInvitedUsersCanVote = true

	defer resetMock()

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Error(err)
	var applicationErr *temporal.ApplicationError
	s.True(errors.As(err, &applicationErr))
	s.Equal("IsOpenOnlyInvitedUsersCanVote true but IsOpen false", applicationErr.Error())
}

func (s *UnitTestSuite) Test_UserOutsideRoomAreaSuggestingTrackMustTriggerTracksListUpdate() {
	var a *activities_mtv.Activities

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID}
	tracksIDsToSuggest := []string{faker.UUIDHyphenated()}
	tracksToSuggestMetadata := []shared.TrackMetadata{
		{
			ID:         tracksIDsToSuggest[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}

	params, creatorDeviceID := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	start := time.Now()

	end := start.Add(defaultDuration * 5000)

	physicalAndTimeConstraints := shared_mtv.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared_mtv.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   end,
		PhysicalConstraintStartsAt: start,
	}

	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.CreatorUserRelatedInformation.UserFitsPositionConstraint = &shared_mtv.FalseValue
	creatorUserID := params.RoomCreatorUserID

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()

	s.env.OnActivity(
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		tracksIDsToSuggest,
		creatorUserID,
		creatorDeviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: tracksToSuggestMetadata,
		UserID:   creatorUserID,
		DeviceID: creatorDeviceID,
	}, nil).Once()

	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	// This activity must be called when a user outside of the
	// room area suggests a song.
	s.env.OnActivity(
		a.NotifySuggestOrVoteUpdateActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		expectedCreator := &shared_mtv.InternalStateUser{
			UserID:                            params.RoomCreatorUserID,
			DeviceID:                          creatorDeviceID,
			TracksVotedFor:                    []string{},
			UserFitsPositionConstraint:        &shared_mtv.FalseValue,
			HasControlAndDelegationPermission: true,
		}
		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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
		}

		mtvState := s.getMtvState(params.RoomCreatorUserID)

		s.False(mtvState.Playing)
		s.Equal(1, mtvState.MinimumScoreToBePlayed)
		s.Equal(expectedCreator, mtvState.UserRelatedInformation)
		s.Equal(expectedTracks, mtvState.Tracks)
		s.True(mtvState.RoomHasTimeAndPositionConstraints)
	}, init)

	creatorSuggestsATrack := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitSuggestTrackSignal(shared_mtv.SuggestTracksSignalArgs{
			TracksToSuggest: tracksIDsToSuggest,
			UserID:          creatorUserID,
			DeviceID:        creatorDeviceID,
		})
	}, creatorSuggestsATrack)

	checkSongHasBeenSuggested := defaultDuration
	registerDelayedCallbackWrapper(func() {
		expectedTracks := []shared_mtv.TrackMetadataWithScoreWithDuration{
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
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

			// Song suggested by the creator
			{
				TrackMetadataWithScore: shared_mtv.TrackMetadataWithScore{
					TrackMetadata: shared.TrackMetadata{
						ID:         tracksToSuggestMetadata[0].ID,
						Title:      tracksToSuggestMetadata[0].Title,
						ArtistName: tracksToSuggestMetadata[0].ArtistName,
						Duration:   0,
					},
					Score: 0,
				},
				Duration: tracksToSuggestMetadata[0].Duration.Milliseconds(),
			},
		}

		mtvState := s.getMtvState(params.RoomCreatorUserID)

		s.Equal(expectedTracks, mtvState.Tracks)
	}, checkSongHasBeenSuggested)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_GetMtvRoomConstraintsDetails() {
	var a *activities_mtv.Activities

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID}

	params, _ := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond

	start := time.Now()

	end := start.Add(defaultDuration * 5000)

	physicalAndTimeConstraints := shared_mtv.MtvRoomPhysicalAndTimeConstraints{
		PhysicalConstraintPosition: shared_mtv.MtvRoomCoords{
			Lat: 42,
			Lng: 42,
		},
		PhysicalConstraintRadius:   5000,
		PhysicalConstraintEndsAt:   end,
		PhysicalConstraintStartsAt: start,
	}

	params.HasPhysicalAndTimeConstraints = true
	params.PhysicalAndTimeConstraints = &physicalAndTimeConstraints
	params.CreatorUserRelatedInformation.UserFitsPositionConstraint = &shared_mtv.FalseValue

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		expectedDetails := shared_mtv.MtvRoomConstraintsDetails{
			PhysicalConstraintEndsAt:   end.Format(time.RFC3339),
			PhysicalConstraintStartsAt: start.Format(time.RFC3339),
			PhysicalConstraintRadius:   5000,
			RoomID:                     params.RoomID,
			PhysicalConstraintPosition: shared_mtv.MtvRoomCoords{
				Lat: 42,
				Lng: 42,
			},
		}

		details := s.getMtvRoomConstraintsDetails()
		s.Equal(expectedDetails, details)
	}, init)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_GetMtvRoomConstraintsDetailsFailRoomDoesntHaveConstraints() {
	var a *activities_mtv.Activities

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID}

	params, _ := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		_, err := s.env.QueryWorkflow(shared_mtv.MtvGetRoomConstraintsDetails)

		s.Error(err)
		s.ErrorIs(err, ErrRoomDoesNotHaveConstraints)
	}, init)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_MtvRoomPanicAfterUnkownWorkflowSignal() {
	var a *activities_mtv.Activities

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID}

	params, _ := getWorkflowInitParams(tracksIDs, 1)
	defaultDuration := 200 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUnkownSignal()
	}, init)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Error(err)
	var panicError *temporal.PanicError
	s.True(errors.As(err, &panicError))
	s.Contains(panicError.Error(), ErrUnknownWorflowSignal.Error())
}

func (s *UnitTestSuite) Test_MtvRoomExitsAfterTerminateSignal() {
	var a *activities_mtv.Activities

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	initialTracksIDs := []string{tracks[0].ID}

	params, _ := getWorkflowInitParams(initialTracksIDs, 1)
	defaultDuration := 200 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitTerminateWorkflowSignal()
	}, init)

	s.env.ExecuteWorkflow(MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Nil(err)
}

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}
