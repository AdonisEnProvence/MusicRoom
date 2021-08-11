package workflows

import (
	"fmt"
	"math/rand"
	"testing"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
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

func (s *UnitTestSuite) emitPlaySignal() {
	fmt.Println("-----EMIT PLAY CALLED IN TEST-----")
	playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})
	s.env.SignalWorkflow(shared.SignalChannelName, playSignal)
}

func (s *UnitTestSuite) emitJoinSignal(userID string, deviceID string) {
	fmt.Println("-----EMIT JOIN CALLED IN TEST-----")
	signal := shared.NewJoinSignal(shared.NewJoinSignalArgs{
		UserID:   userID,
		DeviceID: deviceID,
	})

	s.env.SignalWorkflow(shared.SignalChannelName, signal)
}

func (s *UnitTestSuite) emitPauseSignal() {
	fmt.Println("-----EMIT PAUSED CALLED IN TEST-----")
	pauseSignal := shared.NewPauseSignal(shared.NewPauseSignalArgs{})

	s.env.SignalWorkflow(shared.SignalChannelName, pauseSignal)
}

func (s *UnitTestSuite) emitGoToNextTrackSignal() {
	fmt.Println("-----EMIT GO TO NEXT TRACK IN TEST-----")
	goToNextTrackSignal := shared.NewGoToNexTrackSignal()

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

func getWokflowInitParams(tracksIDs []string) shared.MtvRoomParameters {
	var (
		fakeWorkflowID          = faker.UUIDHyphenated()
		fakeRoomCreatorUserID   = faker.UUIDHyphenated()
		fakeRoomCreatorDeviceID = faker.UUIDHyphenated()
	)

	initialUsers := make(map[string]*shared.InternalStateUser)
	initialUsers[fakeRoomCreatorUserID] = &shared.InternalStateUser{
		UserID:   fakeRoomCreatorUserID,
		DeviceID: fakeRoomCreatorDeviceID,
	}

	return shared.MtvRoomParameters{
		RoomID:               fakeWorkflowID,
		RoomCreatorUserID:    fakeRoomCreatorUserID,
		RoomName:             faker.Word(),
		InitialUsers:         initialUsers,
		InitialTracksIDsList: tracksIDs,
	}
}

// Test_PlayThenPauseTrack scenario:
// TODO redict the scenario
func (s *UnitTestSuite) Test_PlayThenPauseTrack() {
	firstTrackDuration := generateRandomDuration()
	firstTrackDurationFirstThird := firstTrackDuration / 3
	secondTrackDuration := generateRandomDuration()
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
	params := getWokflowInitParams(tracksIDs)

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
		mtvState := s.getMtvState("")
		s.False(mtvState.Playing)

		s.emitPlaySignal()
	}, checkThatRoomIsNotPlaying)

	emitPause := firstTrackDurationFirstThird
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState("")
		s.True(mtvState.Playing)
		s.emitPauseSignal()
	}, emitPause)

	checkThatOneThirdFirstTrackElapsed := defaultDuration
	registerDelayedCallbackWrapper(func() {
		fmt.Println("*********VERIFICATION FIRST THIRD TIER ELAPSED*********")
		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[0].ID,
					ArtistName: tracks[0].ArtistName,
					Title:      tracks[0].Title,
					Duration:   0,
				},
				AlreadyElapsed: 0,
			},
			Duration: firstTrackDuration.Milliseconds(),
			Elapsed:  firstTrackDurationFirstThird.Milliseconds(),
		}
		mtvState := s.getMtvState("")
		fmt.Printf("We should find the first third elapsed for the first track\n%+v\n", mtvState.CurrentTrack)

		s.False(mtvState.Playing)
		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)

	}, checkThatOneThirdFirstTrackElapsed)

	secondEmitPlaySignal := defaultDuration
	//Play alone because the signal is sent as last from registerDelayedCallback
	registerDelayedCallbackWrapper(func() {
		fmt.Println("*********VERIFICATION 3/3 first track*********")
		s.emitPlaySignal()
	}, secondEmitPlaySignal)

	// Important
	// Here we want to update the timeMock before the new timer for the second track
	// Then between this step and the next one the elapsed will incr by defaultDuration
	updateTimeMockForTimerExpiration := firstTrackDurationFirstThird + firstTrackDurationFirstThird
	registerDelayedCallbackWrapper(func() {
	}, updateTimeMockForTimerExpiration)

	sixth := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState("")
		fmt.Printf("We should find the second track with an elapsed at 0\n%+v\n", mtvState.CurrentTrack)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[1].ID,
					ArtistName: tracks[1].ArtistName,
					Title:      tracks[1].Title,
					Duration:   0,
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
		mtvState := s.getMtvState("")
		fmt.Printf("We should find the second track with an elapsed at half second track total duration\n%+v\n", mtvState.CurrentTrack)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[1].ID,
					ArtistName: tracks[1].ArtistName,
					Title:      tracks[1].Title,
					Duration:   0,
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
		mtvState := s.getMtvState("")
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

	firstTrackDuration := generateRandomDuration()

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   firstTrackDuration,
		},
	}
	tracksIDs := []string{tracks[0].ID}
	params := getWokflowInitParams(tracksIDs)

	defaultDuration := 1 * time.Millisecond
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
		activities.JoinActivity,
		mock.Anything,
		mock.Anything,
		fakeUserID,
	).Return(nil).Once()

	checkOnlyOneUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState("")

		s.Empty(mtvState.UserRelatedInformations)
		s.False(mtvState.Playing)
		s.Equal(1, mtvState.UsersLength)
	}, checkOnlyOneUser)

	secondUserJoins := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitJoinSignal(fakeUserID, fakeDeviceID)
	}, secondUserJoins)

	checkTwoUsersThenEmitPlay := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState(fakeUserID)

		s.Equal(2, mtvState.UsersLength)
		expectedInternalStateUser := &shared.InternalStateUser{
			UserID:   fakeUserID,
			DeviceID: fakeDeviceID,
		}

		s.Equal(expectedInternalStateUser, mtvState.UserRelatedInformations)
		s.emitPlaySignal()
	}, checkTwoUsersThenEmitPlay)

	emitPauseSignal := firstTrackDuration - 200*defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState("")

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[0].ID,
					ArtistName: tracks[0].ArtistName,
					Title:      tracks[0].Title,
					Duration:   0,
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
			Duration:   generateRandomDuration(),
		},
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   generateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID, tracks[1].ID}
	params := getWokflowInitParams(tracksIDs)

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
		mtvState := s.getMtvState("")

		s.False(mtvState.Playing)
	}, initialStateQueryDelay)

	// 2. Send the first GoToNextTrack signal.
	firstGoToNextTrackSignal := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitGoToNextTrackSignal()
	}, firstGoToNextTrackSignal)

	// 3. We expect the second initial track to be the current one
	// and the room to be playing.
	verifyThatGoNextTrackWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState("")

		s.True(mtvState.Playing)
		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[1].ID,
					ArtistName: tracks[1].ArtistName,
					Title:      tracks[1].Title,
					Duration:   0,
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
		s.emitGoToNextTrackSignal()
	}, secondGoToNextTrackSignal)

	// 5. We expect the second initial track to still be the current one playing one
	// after we tried to go to the next track.
	verifyThatGoToNextTrackDidntWork := defaultDuration * 200
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState("")

		s.True(mtvState.Playing)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[1].ID,
					ArtistName: tracks[1].ArtistName,
					Title:      tracks[1].Title,
					Duration:   0,
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

func (s *UnitTestSuite) Test_PlayActivityIsNotCalledWhenTryingToPlayTheLastTrackThatEnded() {
	firstTrackDuration := generateRandomDuration()

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   firstTrackDuration,
		},
	}

	tracksIDs := []string{tracks[0].ID}
	params := getWokflowInitParams(tracksIDs)

	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()
	defaultDuration := 1 * time.Millisecond

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
		mtvState := s.getMtvState("")

		s.False(mtvState.Playing)
		s.emitPlaySignal()
	}, initialStateQueryDelay)

	secondStateQueryAfterTotalTrackDuration := firstTrackDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState("")

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[0].ID,
					ArtistName: tracks[0].ArtistName,
					Title:      tracks[0].Title,
					Duration:   0,
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
		s.emitPlaySignal()
	}, secondPlaySignalDelay)

	thirdStateQueryAfterSecondPlaySignal := firstTrackDuration
	registerDelayedCallbackWrapper(func() {
		mtvState := s.getMtvState("")

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[0].ID,
					ArtistName: tracks[0].ArtistName,
					Title:      tracks[0].Title,
					Duration:   0,
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

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}

func generateRandomDuration() time.Duration {
	min := 10
	max := 20
	return time.Second * time.Duration(rand.Intn(max-min)+min)
}
