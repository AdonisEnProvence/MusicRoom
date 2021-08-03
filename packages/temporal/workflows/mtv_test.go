package workflows_test

import (
	"fmt"
	"math/rand"
	"testing"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/AdonisEnProvence/MusicRoom/workflows"

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

//Should those be methods ? no risk for conflicts ?
func getMtvState(s *UnitTestSuite, timerBefore time.Duration) shared.MtvRoomExposedState {
	if timerBefore > 0 {
		waitForTimeout(timerBefore)
	}
	var mtvState shared.MtvRoomExposedState

	res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
	s.NoError(err)

	err = res.Get(&mtvState)
	s.NoError(err)

	return mtvState
}

func waitForTimeout(duration time.Duration) {
	// As temporal has it's own time notion, uses auto fire timer to speed up tests execution
	// We need to manually wait for the expected elapsed track delta
	// In this way time.now() will work as we expect
	timer := time.NewTimer(duration)
	<-timer.C
	fmt.Printf("TIMER ENDED\n")
}

func emitPlaySignal(s *UnitTestSuite, timerBefore time.Duration) {
	if timerBefore > 0 {
		waitForTimeout(timerBefore)
	}
	playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})

	s.env.SignalWorkflow(shared.SignalChannelName, playSignal)
}

func emitPauseSignal(s *UnitTestSuite, timerBefore time.Duration) {
	if timerBefore > 0 {
		waitForTimeout(timerBefore)
	}
	pauseSignal := shared.NewPauseSignal(shared.NewPauseSignalArgs{})

	s.env.SignalWorkflow(shared.SignalChannelName, pauseSignal)
}

// Test_PlayThenPauseTrack scenario:
//
// 1. We instantiate a mtv room workflow with two initial tracks.
// The workflow will fetch the information of these tracks
// and acknowledge the room creation.
//
// 2. We expect the first track to do not be played until
// we receive a PLAY signal.
//
// 3. We send a PLAY signal to the workflow. It will launch a track timer activity,
// that will immediately return a `MtvRoomTimer` indicating that the song has been stopped
// after its first third had been played. Please note that we can not keep a mocked activity
// running: we must directly return its result. The consequence is that we will automatically
// go from playing state to playing state or to paused state, and receiving a PAUSE event
// will have no effect, even if in this step we simulate such an event.
//
// 4. We send a PAUSE signal. As described above, this will have no effect.
// We just want to assert that such an event can be sent to the workflow without
// throwing an error.
//
// 5. We expect the `getState` query to return that the current track
// is the first one we passed to the workflow.
//
// 6. As the first track was considered stopped, we send a PLAY event
// to resume the listening.
//
// 7. We expect the first track to have ended and the second one to be the current track.
//
// 8. When the last track has ended, we expect the player to be on paused state and
// the current track to remain the last initial track.
func (s *UnitTestSuite) Test_PlayThenPauseTrack() {
	var (
		fakeWorkflowID        = faker.UUIDHyphenated()
		fakeRoomCreatorUserID = faker.UUIDHyphenated()
	)
	firstTrackDuration := generateRandomDuration()
	firstTrackDurationFirstThird := firstTrackDuration / 3
	secondTrackDuration := generateRandomDuration()
	defaultDuration := 1 * time.Millisecond
	msDelta := 50.00

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
	fmt.Printf("WE GOT\n%+v\n", tracks)

	tracksIDs := []string{tracks[0].ID, tracks[1].ID}
	params := shared.MtvRoomParameters{
		RoomID:               fakeWorkflowID,
		RoomCreatorUserID:    fakeRoomCreatorUserID,
		RoomName:             faker.Word(),
		InitialUsers:         []string{fakeRoomCreatorUserID},
		InitialTracksIDsList: tracksIDs,
	}

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

	// 2. We expect the first track to do not be played until we want it to be.
	initialStateQueryDelay := defaultDuration
	s.env.RegisterDelayedCallback(func() {
		mtvState := getMtvState(s, 0)
		s.False(mtvState.Playing)

		emitPlaySignal(s, 0)
	}, initialStateQueryDelay)

	firstPauseSignal := initialStateQueryDelay + firstTrackDurationFirstThird
	s.env.RegisterDelayedCallback(func() {
		emitPauseSignal(s, firstTrackDurationFirstThird)
	}, firstPauseSignal)

	verifyThirdDurationElapsed := firstPauseSignal + defaultDuration
	s.env.RegisterDelayedCallback(func() {
		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[0].ID,
					ArtistName: tracks[0].ArtistName,
					Title:      tracks[0].Title,
					Duration:   0,
				},
				AlreadyElapsed: 0,
				StartedOn:      time.Time{},
			},
			Duration: firstTrackDuration.Milliseconds(),
			Elapsed:  0, //see expectedElapsed
		}
		mtvState := getMtvState(s, 0)
		fmt.Printf("TITITITITITITI\n%+v", mtvState.CurrentTrack)

		s.False(mtvState.Playing)
		expectedElapsed := firstTrackDurationFirstThird.Milliseconds()
		s.InDelta(expectedElapsed, mtvState.CurrentTrack.Elapsed, msDelta)
		mtvState.CurrentTrack.Elapsed = 0
		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)

		emitPlaySignal(s, 0)
	}, verifyThirdDurationElapsed)

	// tmp := verifyThirdDurationElapsed + (firstTrackDurationFirstThird*2 - 20*time.Millisecond)
	// s.env.RegisterDelayedCallback(func() {
	// 	mtvState := getMtvState(s, firstTrackDurationFirstThird*2-20*time.Millisecond)
	// 	fmt.Printf("COCOCOCOCOCOOC\n%+v", mtvState.CurrentTrack)
	// 	expectedElapsed := firstTrackDuration.Milliseconds() - 20
	// 	s.InDelta(expectedElapsed, mtvState.CurrentTrack.Elapsed, msDelta)
	// }, tmp)

	checkForSecondTrackAsCurrent := verifyThirdDurationElapsed + (firstTrackDurationFirstThird * 2)
	s.env.RegisterDelayedCallback(func() {
		mtvState := getMtvState(s, firstTrackDurationFirstThird*2) //WE HAVE BIG PROBLEM IN THIS AREA
		fmt.Printf("YESSSSSSSSSSSSSS\n%+v", mtvState.CurrentTrack)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[1].ID,
					ArtistName: tracks[1].ArtistName,
					Title:      tracks[1].Title,
					Duration:   0,
				},
				AlreadyElapsed: 0,
				StartedOn:      time.Time{},
			},
			Duration: secondTrackDuration.Milliseconds(),
			Elapsed:  0, //see expectedElapsed
		}

		expectedElapsed := 0
		s.InDelta(expectedElapsed, mtvState.CurrentTrack.Elapsed, msDelta)
		mtvState.CurrentTrack.Elapsed = 0
		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, checkForSecondTrackAsCurrent)

	checkForTheSecondTrackEnd := checkForSecondTrackAsCurrent + secondTrackDuration
	s.env.RegisterDelayedCallback(func() {
		mtvState := getMtvState(s, secondTrackDuration)
		fmt.Printf("BAPTISTEEEEEEEEEEEEEEEEEEEEEEEEE\n%+v", mtvState.CurrentTrack)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[1].ID,
					ArtistName: tracks[1].ArtistName,
					Title:      tracks[1].Title,
					Duration:   0,
				},
				AlreadyElapsed: 0,
				StartedOn:      time.Time{},
			},
			Duration: secondTrackDuration.Milliseconds(),
			Elapsed:  0, //see expectedElapsed
		}

		expectedElapsed := secondTrackDuration.Milliseconds()
		s.InDelta(expectedElapsed, mtvState.CurrentTrack.Elapsed, msDelta)
		mtvState.CurrentTrack.Elapsed = 0
		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, checkForTheSecondTrackEnd)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, params)

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
		fakeWorkflowID        = faker.UUIDHyphenated()
		fakeRoomCreatorUserID = faker.UUIDHyphenated()
		fakeUserID            = faker.UUIDHyphenated()
	)

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   generateRandomDuration(),
		},
	}
	tracksIDs := []string{tracks[0].ID}
	params := shared.MtvRoomParameters{
		RoomID:               fakeWorkflowID,
		RoomCreatorUserID:    fakeRoomCreatorUserID,
		RoomName:             faker.Word(),
		InitialUsers:         []string{fakeRoomCreatorUserID},
		InitialTracksIDsList: tracksIDs,
	}

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

	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.Len(mtvState.Users, 1)
	}, 1*time.Second)

	s.env.RegisterDelayedCallback(func() {
		signal := shared.NewJoinSignal(shared.NewJoinSignalArgs{
			UserID: fakeUserID,
		})

		s.env.SignalWorkflow(shared.SignalChannelName, signal)
	}, 2*time.Second)

	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.Len(mtvState.Users, 2)
	}, 3*time.Second)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, params)

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
// 3. We expect the second track to have been played
// and to be the current track, although it has ended.
//
// 4. We send another GoToNextTrack signal.
//
// 5. We expect the second initial track to still be
// the current one.
func (s *UnitTestSuite) Test_GoToNextTrack() {
	var (
		fakeWorkflowID        = faker.UUIDHyphenated()
		fakeRoomCreatorUserID = faker.UUIDHyphenated()
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
	params := shared.MtvRoomParameters{
		RoomID:               fakeWorkflowID,
		RoomCreatorUserID:    fakeRoomCreatorUserID,
		RoomName:             faker.Word(),
		InitialUsers:         []string{fakeRoomCreatorUserID},
		InitialTracksIDsList: tracksIDs,
	}
	secondTrackDuration := tracks[1].Duration

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

	trackTimerActivityCalls := 0
	s.env.OnActivity(
		activities.TrackTimerActivity,
		mock.Anything,
		mock.Anything,
	).Return(func(ctx context.Context, timerState shared.MtvRoomTimer) (shared.MtvRoomTimer, error) {
		defer func() {
			trackTimerActivityCalls++
		}()

		switch trackTimerActivityCalls {
		case 0:
			s.Equal(shared.MtvRoomTimerStateIdle, timerState.State)
			s.Equal(time.Duration(0), timerState.Elapsed)
			s.Equal(secondTrackDuration, timerState.TotalDuration)

			return shared.MtvRoomTimer{
				State:         shared.MtvRoomTimerStateFinished,
				Elapsed:       secondTrackDuration,
				TotalDuration: secondTrackDuration,
			}, nil

		default:
			return shared.MtvRoomTimer{}, errors.New("no timer to return for this call")
		}
	}).Once()

	// 1. We expect the room to be paused by default.
	initialStateQueryDelay := 1 * time.Second
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.False(mtvState.Playing)
	}, initialStateQueryDelay)

	// 2. Send the first GoToNextTrack signal.
	firstGoToNextTrackSignal := initialStateQueryDelay + 1*time.Second
	s.env.RegisterDelayedCallback(func() {
		goToNextTrackSignal := shared.NewGoToNexTrackSignal()

		s.env.SignalWorkflow(shared.SignalChannelName, goToNextTrackSignal)
	}, firstGoToNextTrackSignal)

	// 3. We expect the second initial track to be the current one
	// and the room to be not in playing state anymore.
	secondStateQueryAfterSecondTrackTotalDuration := firstGoToNextTrackSignal + secondTrackDuration
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.False(mtvState.Playing)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[1].ID,
					ArtistName: tracks[1].ArtistName,
					Title:      tracks[1].Title,
					Duration:   0,
				},
				Elapsed: 0,
			},
			Duration: tracks[1].Duration.Milliseconds(),
			Elapsed:  tracks[1].Duration.Milliseconds(),
		}

		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, secondStateQueryAfterSecondTrackTotalDuration)

	// 4. Send the second GoToNextTrack signal.
	secondGoToNextTrackSignal := secondStateQueryAfterSecondTrackTotalDuration + 1*time.Second
	s.env.RegisterDelayedCallback(func() {
		goToNextTrackSignal := shared.NewGoToNexTrackSignal()

		s.env.SignalWorkflow(shared.SignalChannelName, goToNextTrackSignal)
	}, secondGoToNextTrackSignal)

	// 5. We expect the second initial track to still be the current one
	// after we tried to go to the next track.
	thirdStateQueryAfterTryingToGoToNextTrack := firstGoToNextTrackSignal + secondTrackDuration
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.False(mtvState.Playing)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[1].ID,
					ArtistName: tracks[1].ArtistName,
					Title:      tracks[1].Title,
					Duration:   0,
				},
				Elapsed: 0,
			},
			Duration: tracks[1].Duration.Milliseconds(),
			Elapsed:  tracks[1].Duration.Milliseconds(),
		}

		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, thirdStateQueryAfterTryingToGoToNextTrack)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_PlayActivityIsNotCalledWhenTryingToPlayTheLastTrackThatEnded() {
	var (
		fakeWorkflowID        = faker.UUIDHyphenated()
		fakeRoomCreatorUserID = faker.UUIDHyphenated()
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
	params := shared.MtvRoomParameters{
		RoomID:               fakeWorkflowID,
		RoomCreatorUserID:    fakeRoomCreatorUserID,
		RoomName:             faker.Word(),
		InitialUsers:         []string{fakeRoomCreatorUserID},
		InitialTracksIDsList: tracksIDs,
	}

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

	trackTimerActivityCalls := 0
	s.env.OnActivity(
		activities.TrackTimerActivity,
		mock.Anything,
		mock.Anything,
	).Return(func(ctx context.Context, timerState shared.MtvRoomTimer) (shared.MtvRoomTimer, error) {
		defer func() {
			trackTimerActivityCalls++
		}()

		switch trackTimerActivityCalls {
		case 0:
			s.Equal(shared.MtvRoomTimerStateIdle, timerState.State)
			s.Equal(time.Duration(0), timerState.Elapsed)
			s.Equal(firstTrackDuration, timerState.TotalDuration)

			return shared.MtvRoomTimer{
				State:         shared.MtvRoomTimerStatePending,
				Elapsed:       firstTrackDuration,
				TotalDuration: firstTrackDuration,
			}, nil

		default:
			return shared.MtvRoomTimer{}, errors.New("no timer to return for this call")
		}
	}).Times(1)

	initialStateQueryDelay := 1 * time.Second
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.False(mtvState.Playing)
	}, initialStateQueryDelay)

	firstPlaySignalDelay := initialStateQueryDelay + 1*time.Second
	s.env.RegisterDelayedCallback(func() {
		playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})

		s.env.SignalWorkflow(shared.SignalChannelName, playSignal)
	}, firstPlaySignalDelay)

	secondStateQueryAfterTotalTrackDuration := firstPlaySignalDelay + firstTrackDuration
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[0].ID,
					ArtistName: tracks[0].ArtistName,
					Title:      tracks[0].Title,
					Duration:   0,
				},
				Elapsed: 0,
			},
			Duration: firstTrackDuration.Milliseconds(),
			Elapsed:  firstTrackDuration.Milliseconds(),
		}

		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, secondStateQueryAfterTotalTrackDuration)

	secondPlaySignalDelay := secondStateQueryAfterTotalTrackDuration + 1*time.Second
	s.env.RegisterDelayedCallback(func() {
		playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})

		s.env.SignalWorkflow(shared.SignalChannelName, playSignal)
	}, secondPlaySignalDelay)

	thirdStateQueryAfterSecondPlaySignal := firstPlaySignalDelay + firstTrackDuration
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
			CurrentTrack: shared.CurrentTrack{
				TrackMetadata: shared.TrackMetadata{
					ID:         tracks[0].ID,
					ArtistName: tracks[0].ArtistName,
					Title:      tracks[0].Title,
					Duration:   0,
				},
				Elapsed: 0,
			},
			Duration: firstTrackDuration.Milliseconds(),
			Elapsed:  firstTrackDuration.Milliseconds(),
		}

		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, thirdStateQueryAfterSecondPlaySignal)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}

func generateRandomDuration() time.Duration {
	return time.Minute*time.Duration(rand.Intn(10)) + time.Second*time.Duration(rand.Intn(59))
}
