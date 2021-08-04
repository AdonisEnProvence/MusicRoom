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

//Should those be methods ? no risk for conflicts ?
func getMtvState(s *UnitTestSuite) shared.MtvRoomExposedState {
	var mtvState shared.MtvRoomExposedState

	res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
	s.NoError(err)

	err = res.Get(&mtvState)
	s.NoError(err)

	return mtvState
}

func emitPlaySignal(s *UnitTestSuite) {
	fmt.Println("-----EMIT PLAY CALLED IN TEST-----")
	playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})
	s.env.SignalWorkflow(shared.SignalChannelName, playSignal)
}

func emitPauseSignal(s *UnitTestSuite) {
	fmt.Println("-----EMIT PAUSED CALLED IN TEST-----")
	pauseSignal := shared.NewPauseSignal(shared.NewPauseSignalArgs{})

	s.env.SignalWorkflow(shared.SignalChannelName, pauseSignal)
}

func InitTimeMock() (func(toAdd time.Duration) time.Time, func()) {
	now := time.Now()
	oldImplem := TimeWrapper
	timeMock := new(mocks.TimeWrapperType)
	tmp := timeMock.On("Execute")
	tmp.Return(now)
	TimeWrapper = timeMock.Execute

	return func(toAdd time.Duration) time.Time {
			now = now.Add(toAdd)
			tmp.Return(now)

			fmt.Println(">>>>>>>>>>>>>>>")
			fmt.Printf("Now update received = %+v\n", toAdd.Seconds())
			fmt.Printf("now = %+v\n", now)
			fmt.Println("<<<<<<<<<<<<<<<")
			return now
		}, func() {
			TimeWrapper = oldImplem
		}
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
	addToNextTimeNowMock, resetMock := InitTimeMock()

	defer resetMock()

	defaultDuration := 1 * time.Millisecond
	msDelta := 01.00

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
	fmt.Printf("%+v\n", tracks)

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

	var temporalTemporality time.Duration
	// 2. We expect the first track to do not be played until we want it to be.
	first := defaultDuration
	temporalTemporality += first
	s.env.RegisterDelayedCallback(func() {
		mtvState := getMtvState(s)
		s.False(mtvState.Playing)

		emitPlaySignal(s)
		addToNextTimeNowMock(first)
	}, temporalTemporality)

	second := firstTrackDurationFirstThird
	temporalTemporality += second
	s.env.RegisterDelayedCallback(func() {
		fmt.Printf("\nMA MAMAN C EST LA PLUS BELLE DES MAMANS %+v\n", second)
		addToNextTimeNowMock(second)
		emitPauseSignal(s)
	}, temporalTemporality)

	third := defaultDuration
	temporalTemporality += third
	s.env.RegisterDelayedCallback(func() {
		addToNextTimeNowMock(third)
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
				StartedOn:      time.Time{},
			},
			Duration: firstTrackDuration.Milliseconds(),
			Elapsed:  0, //see expectedElapsed
		}
		mtvState := getMtvState(s)
		fmt.Printf("We should find the first third elapsed for the first track\n%+v\n", mtvState.CurrentTrack)

		s.False(mtvState.Playing)
		expectedElapsed := firstTrackDurationFirstThird.Milliseconds()
		s.InDelta(expectedElapsed, mtvState.CurrentTrack.Elapsed, msDelta)
		mtvState.CurrentTrack.Elapsed = 0
		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)

	}, temporalTemporality)

	fourth := defaultDuration
	temporalTemporality += fourth
	//Play alone because the signal is sent as last from registerDelayedCallback
	s.env.RegisterDelayedCallback(func() {
		fmt.Println("*********VERIFICATION 3/3 first track*********")
		emitPlaySignal(s)
		addToNextTimeNowMock(fourth)
	}, temporalTemporality)

	fifth := firstTrackDurationFirstThird + firstTrackDurationFirstThird
	temporalTemporality += fifth
	s.env.RegisterDelayedCallback(func() {
		addToNextTimeNowMock(fifth)
	}, temporalTemporality)

	// toto := updateNowMock + 4*defaultDuration
	// s.env.RegisterDelayedCallback(func() {
	// 	mtvState := getMtvState(s)
	// 	fmt.Printf("\nPFFFFFFFFFFFFFFFFFFFFFF %+v\n", mtvState.CurrentTrack)
	// }, toto)

	sixth := defaultDuration
	temporalTemporality += sixth
	s.env.RegisterDelayedCallback(func() {
		addToNextTimeNowMock(sixth)
		mtvState := getMtvState(s)
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
				StartedOn:      time.Time{},
			},
			Duration: secondTrackDuration.Milliseconds(),
			Elapsed:  0, //see expectedElapsed
		}

		expectedElapsed := 0
		s.InDelta(expectedElapsed, mtvState.CurrentTrack.Elapsed, msDelta)
		mtvState.CurrentTrack.Elapsed = 0
		s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	}, temporalTemporality)

	seventh := secondTrackDuration - defaultDuration
	temporalTemporality += seventh
	s.env.RegisterDelayedCallback(func() {
		addToNextTimeNowMock(seventh)
		mtvState := getMtvState(s)
		fmt.Printf("We should find the second track with an elapsed at TOTALDURATION\n%+v\n", mtvState.CurrentTrack)

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
	}, temporalTemporality)

	eighth := 200 * defaultDuration
	temporalTemporality += eighth
	s.env.RegisterDelayedCallback(func() {
		addToNextTimeNowMock(eighth)
		mtvState := getMtvState(s)
		fmt.Printf("We should find the second track with an elapsed at TOTALDURATION\n%+v\n", mtvState.CurrentTrack)
	}, temporalTemporality)

	// tmp := checkForSecondTrackAsCurrent + 200*defaultDuration
	// s.env.RegisterDelayedCallback(func() {
	// 	fmt.Println("*********VERIFICATION WE HAVE THE SECOND TRACK GOING ON*********")

	// 	addToNextTimeNowMock(secondTrackDuration)
	// 	mtvState := getMtvState(s) //secondTrackDuration)
	// 	fmt.Printf("We should find the second track\n%+v", mtvState.CurrentTrack)

	// 	expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
	// 		CurrentTrack: shared.CurrentTrack{
	// 			TrackMetadata: shared.TrackMetadata{
	// 				ID:         tracks[1].ID,
	// 				ArtistName: tracks[1].ArtistName,
	// 				Title:      tracks[1].Title,
	// 				Duration:   0,
	// 			},
	// 			AlreadyElapsed: 0,
	// 			StartedOn:      time.Time{},
	// 		},
	// 		Duration: secondTrackDuration.Milliseconds(),
	// 		Elapsed:  0, //see expectedElapsed
	// 	}

	// 	expectedElapsed := secondTrackDuration.Milliseconds()
	// 	s.InDelta(expectedElapsed, mtvState.CurrentTrack.Elapsed, msDelta)
	// 	mtvState.CurrentTrack.Elapsed = 0
	// 	s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	// }, tmp)

	// checkForTheSecondTrackEnd := checkForSecondTrackAsCurrent + secondTrackDuration

	// firstPauseSignalDelay := firstPlaySignalDelay + firstTrackDuration
	// s.env.RegisterDelayedCallback(func() {
	// 	playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})
	// 	s.env.SignalWorkflow(shared.SignalChannelName, playSignal)

	// 	// As temporal has it's own time notion, uses auto fire timer to speed up tests execution
	// 	// We need to manually wait for the expected elapsed track delta
	// 	// In this way time.now() will work as we expect
	// 	firstTrackTotalDurationTimer := time.NewTimer(firstTrackDuration)
	// 	<-firstTrackTotalDurationTimer.C
	// }, firstPauseSignalDelay)

	// // 5. We want the first track to be the current one.
	// secondStateQueryAfterTotalTrackDuration := firstPauseSignalDelay + firstTrackDuration

	// s.env.RegisterDelayedCallback(func() {
	// 	var mtvState shared.MtvRoomExposedState

	// 	res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
	// 	s.NoError(err)

	// 	err = res.Get(&mtvState)
	// 	s.NoError(err)

	// 	expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
	// 		CurrentTrack: shared.CurrentTrack{
	// 			TrackMetadata: shared.TrackMetadata{
	// 				ID:         tracks[0].ID,
	// 				ArtistName: tracks[0].ArtistName,
	// 				Title:      tracks[0].Title,
	// 				Duration:   0,
	// 			},
	// 			Elapsed: 0,
	// 		},
	// 		Duration: firstTrackDuration.Milliseconds(),
	// 		Elapsed:  0, //see expectedElapsed
	// 	}

	// 	expectedElapsed := firstTrackDurationFirstThird.Milliseconds()
	// 	s.InDelta(expectedElapsed, mtvState.CurrentTrack.Elapsed, 3)
	// 	mtvState.CurrentTrack.Elapsed = 0
	// 	s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	// }, secondStateQueryAfterTotalTrackDuration)

	// // 6. We want to resume the first track.
	// secondPlaySignalDelay := secondStateQueryAfterTotalTrackDuration + 1*time.Millisecond
	// s.env.RegisterDelayedCallback(func() {
	// 	playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})

	// 	s.env.SignalWorkflow(shared.SignalChannelName, playSignal)
	// }, secondPlaySignalDelay)

	// // // 7. We expect the first song and the second song to have finished.
	// // // While the second one is finished, we expect to still be the CurrentTrack.
	// stateQueryAfterFirstTrackMustHaveFinished := secondPlaySignalDelay + firstTrackDuration
	// s.env.RegisterDelayedCallback(func() {
	// 	var mtvState shared.MtvRoomExposedState

	// 	res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
	// 	s.NoError(err)

	// 	err = res.Get(&mtvState)
	// 	s.NoError(err)

	// 	expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
	// 		CurrentTrack: shared.CurrentTrack{
	// 			TrackMetadata: shared.TrackMetadata{
	// 				ID:         tracks[1].ID,
	// 				ArtistName: tracks[1].ArtistName,
	// 				Title:      tracks[1].Title,
	// 				Duration:   0,
	// 			},
	// 			Elapsed: 0,
	// 		},
	// 		Duration: secondTrackDuration.Milliseconds(),
	// 		Elapsed:  secondTrackDuration.Milliseconds(),
	// 	}

	// 	s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	// }, stateQueryAfterFirstTrackMustHaveFinished)

	// // // 8.We expect the last track to remain the current one and the player
	// // // to be on paused state.
	// stateQueryAfterAllTracksMustHaveFinished := stateQueryAfterFirstTrackMustHaveFinished + firstTrackDuration
	// s.env.RegisterDelayedCallback(func() {
	// 	var mtvState shared.MtvRoomExposedState

	// 	res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
	// 	s.NoError(err)

	// 	err = res.Get(&mtvState)
	// 	s.NoError(err)

	// 	s.False(mtvState.Playing)

	// 	expectedExposedCurrentTrack := shared.ExposedCurrentTrack{
	// 		CurrentTrack: shared.CurrentTrack{
	// 			TrackMetadata: shared.TrackMetadata{
	// 				ID:         tracks[1].ID,
	// 				ArtistName: tracks[1].ArtistName,
	// 				Title:      tracks[1].Title,
	// 				Duration:   0,
	// 			},
	// 			Elapsed: 0,
	// 		},
	// 		Duration: secondTrackDuration.Milliseconds(),
	// 		Elapsed:  secondTrackDuration.Milliseconds(),
	// 	}

	// 	s.Equal(&expectedExposedCurrentTrack, mtvState.CurrentTrack)
	// }, stateQueryAfterAllTracksMustHaveFinished)

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
