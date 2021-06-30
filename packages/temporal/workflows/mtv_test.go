package workflows_test

import (
	"context"
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
	).Return(tracks, nil)
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil)
	s.env.OnActivity(
		activities.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil)
	s.env.OnActivity(
		activities.PauseActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil)

	var timerToReturn shared.MtvRoomTimer
	s.env.OnActivity(
		activities.TrackTimerActivity,
		mock.Anything,
		mock.Anything,
	).Return(func(ctx context.Context, timerState shared.MtvRoomTimer) (shared.MtvRoomTimer, error) {
		return timerToReturn, nil
	})

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
		timerToReturn = shared.MtvRoomTimer{
			State:         shared.MtvRoomTimerStatePending,
			Elapsed:       firstTrackDurationFirstThird,
			TotalDuration: firstTrackDuration,
		}

		playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})

		s.env.SignalWorkflow(shared.SignalChannelName, playSignal)
	}, firstPlaySignalDelay)
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.True(mtvState.Playing)
	}, firstPlaySignalDelay+1*time.Millisecond)

	firstPauseSignalDelay := firstPlaySignalDelay + 1*time.Millisecond + firstTrackDurationFirstThird
	s.env.RegisterDelayedCallback(func() {
		pauseSignal := shared.NewPauseSignal(shared.NewPauseSignalArgs{})

		s.env.SignalWorkflow(shared.SignalChannelName, pauseSignal)
	}, firstPauseSignalDelay)
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.False(mtvState.Playing)
	}, firstPauseSignalDelay+1*time.Millisecond)

	secondStateQueryAfterTotalTrackDuration := firstPauseSignalDelay + firstTrackDuration
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.False(mtvState.Playing)
		s.Equal(tracks[0], mtvState.CurrentTrack)
	}, secondStateQueryAfterTotalTrackDuration)

	secondPlaySignalDelay := secondStateQueryAfterTotalTrackDuration + 1*time.Millisecond
	s.env.RegisterDelayedCallback(func() {
		timerToReturn = shared.MtvRoomTimer{
			State:         shared.MtvRoomTimerStateFinished,
			Elapsed:       firstTrackDuration,
			TotalDuration: firstTrackDuration,
		}

		playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})

		s.env.SignalWorkflow(shared.SignalChannelName, playSignal)
	}, secondPlaySignalDelay)
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.True(mtvState.Playing)
	}, secondPlaySignalDelay+1*time.Millisecond)

	stateQueryAfterFirstTrackMustHaveFinished := secondPlaySignalDelay + firstTrackDuration
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.True(mtvState.Playing)
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
	).Return(tracks, nil)
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil)
	s.env.OnActivity(
		activities.JoinActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil)

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
	).Return(tracksList, nil)
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil)

	// Play tracks as soon as possible.
	s.env.RegisterDelayedCallback(func() {
		signal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})

		s.env.SignalWorkflow(shared.SignalChannelName, signal)
	}, 0*time.Second)
	// Query the state after setup activities have been called.
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.True(mtvState.Playing)
		s.Equal(tracksList[0], mtvState.CurrentTrack)
		s.Len(mtvState.Tracks, 1)
		s.Len(mtvState.TracksIDsList, 1)
	}, 1*time.Second)
	// The first track has finished.
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.True(mtvState.Playing)
		s.Equal(tracksList[1], mtvState.CurrentTrack)
		s.Len(mtvState.Tracks, 0)
		s.Len(mtvState.TracksIDsList, 0)
	}, tracksList[0].Duration+1*time.Millisecond)
	// The last track has finished.
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.MtvRoomExposedState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.False(mtvState.Playing)
		s.Equal(tracksList[1], mtvState.CurrentTrack)
		s.Len(mtvState.Tracks, 0)
		s.Len(mtvState.TracksIDsList, 0)
	}, tracksList[0].Duration+1*time.Millisecond+tracksList[1].Duration+1*time.Millisecond)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *UnitTestSuite) Test_YoloWorkflow() {
	s.env.OnActivity(
		activities.TrackTimerActivity,
		mock.Anything,
		mock.Anything,
	).Return(func(ctx context.Context, timerState shared.MtvRoomTimer) (shared.MtvRoomTimer, error) {
		return shared.MtvRoomTimer{
			State:         shared.MtvRoomTimerStatePending,
			Elapsed:       time.Second * 10,
			TotalDuration: time.Second * 100,
		}, nil
	})

	s.env.ExecuteWorkflow(workflows.YoloWorkflow)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.NoError(err)
}

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}

func generateRandomDuration() time.Duration {
	return time.Minute*time.Duration(rand.Intn(10)) + time.Second*time.Duration(rand.Intn(59))
}
