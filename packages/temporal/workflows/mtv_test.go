package workflows_test

import (
	"context"
	"errors"
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
// 7. We expect the first track and the second track to have ended.
// We expect the second one to remain the current track, as its the last of the track list.
func (s *UnitTestSuite) Test_PlayThenPauseTrack() {
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
	firstTrackDuration := tracks[0].Duration
	firstTrackDurationFirstThird := tracks[0].Duration / 3

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
			return shared.MtvRoomTimer{
				State:         shared.MtvRoomTimerStatePending,
				Elapsed:       firstTrackDurationFirstThird,
				TotalDuration: firstTrackDuration,
			}, nil

		case 1:
			return shared.MtvRoomTimer{
				State:         shared.MtvRoomTimerStateFinished,
				Elapsed:       firstTrackDuration,
				TotalDuration: firstTrackDuration,
			}, nil

		case 2:
			return shared.MtvRoomTimer{
				State:         shared.MtvRoomTimerStateFinished,
				Elapsed:       tracks[1].Duration,
				TotalDuration: tracks[1].Duration,
			}, nil

		default:
			return shared.MtvRoomTimer{}, errors.New("no timer to return for this call")
		}
	}).Times(3)

	// 2. We expect the first track to do not be played until we want it to be.
	initialStateQueryDelay := 1 * time.Second
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.False(mtvState.Playing)
	}, initialStateQueryDelay)

	// 3. Launch the first track. It will be stopped at the first third.
	firstPlaySignalDelay := initialStateQueryDelay + 1*time.Second
	s.env.RegisterDelayedCallback(func() {
		playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})

		s.env.SignalWorkflow(shared.SignalChannelName, playSignal)
	}, firstPlaySignalDelay)

	// 4. This has no effect on the state machine, but we want to be sure
	// such an event can be sent to the state machine without throwing an error.
	firstPauseSignalDelay := firstPlaySignalDelay + 1*time.Millisecond + firstTrackDurationFirstThird
	s.env.RegisterDelayedCallback(func() {
		pauseSignal := shared.NewPauseSignal(shared.NewPauseSignalArgs{})

		s.env.SignalWorkflow(shared.SignalChannelName, pauseSignal)
	}, firstPauseSignalDelay)

	// 5. We want the first track to be the current one.
	secondStateQueryAfterTotalTrackDuration := firstPauseSignalDelay + firstTrackDuration
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.Equal(tracks[0], mtvState.CurrentTrack)
	}, secondStateQueryAfterTotalTrackDuration)

	// 6. We want to resume the first track.
	secondPlaySignalDelay := secondStateQueryAfterTotalTrackDuration + 1*time.Millisecond
	s.env.RegisterDelayedCallback(func() {
		playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})

		s.env.SignalWorkflow(shared.SignalChannelName, playSignal)
	}, secondPlaySignalDelay)

	// 7. We expect the first song and the second song to have finished.
	// While the second one is finished, we expect to still be the CurrentTrack.
	stateQueryAfterFirstTrackMustHaveFinished := secondPlaySignalDelay + firstTrackDuration
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.Equal(tracks[1], mtvState.CurrentTrack)
	}, stateQueryAfterFirstTrackMustHaveFinished)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

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

func (s *UnitTestSuite) Test_AutomaticTracksListPlaying() {
	var (
		fakeWorkflowID = faker.UUIDHyphenated()
		fakeUserID     = faker.UUIDHyphenated()
	)

	tracksList := []shared.TrackMetadata{
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
	params := shared.MtvRoomParameters{
		RoomID:               fakeWorkflowID,
		RoomCreatorUserID:    fakeUserID,
		RoomName:             faker.Word(),
		InitialUsers:         []string{fakeUserID},
		InitialTracksIDsList: []string{tracksList[0].ID, tracksList[1].ID},
	}

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		mock.Anything,
	).Return(tracksList, nil).Once()
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)
	s.env.OnActivity(
		activities.PauseActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(1)

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
			return shared.MtvRoomTimer{
				State:         shared.MtvRoomTimerStateFinished,
				Elapsed:       tracksList[0].Duration,
				TotalDuration: tracksList[0].Duration,
			}, nil

		case 1:
			return shared.MtvRoomTimer{
				State:         shared.MtvRoomTimerStateFinished,
				Elapsed:       tracksList[0].Duration,
				TotalDuration: tracksList[0].Duration,
			}, nil

		default:
			return shared.MtvRoomTimer{}, errors.New("no timer to return for this call")
		}
	}).Times(2)

	// Query the state after setup activities have been called.
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		// s.True(mtvState.Playing)
		s.Equal(tracksList[0], mtvState.CurrentTrack)
		s.Len(mtvState.Tracks, 1)
		s.Len(mtvState.TracksIDsList, 1)
	}, 1*time.Second)
	// The first track has finished.

	// Play tracks as soon as possible.
	s.env.RegisterDelayedCallback(func() {
		signal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})

		s.env.SignalWorkflow(shared.SignalChannelName, signal)
	}, 2*time.Second)

	// The last track has finished.
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		// s.False(mtvState.Playing)
		s.Equal(tracksList[1], mtvState.CurrentTrack)
		s.Len(mtvState.Tracks, 0)
		s.Len(mtvState.TracksIDsList, 0)
	}, tracksList[0].Duration+1*time.Millisecond+tracksList[1].Duration+1*time.Millisecond)

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
