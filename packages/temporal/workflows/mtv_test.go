package workflows_test

import (
	"adonis-en-provence/music_room/activities"
	"adonis-en-provence/music_room/shared"
	"adonis-en-provence/music_room/workflows"
	"math/rand"
	"testing"
	"time"

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
	}
	tracksIDs := []string{tracks[0].ID}
	state := shared.ControlState{
		RoomID:            fakeWorkflowID,
		RoomCreatorUserID: fakeRoomCreatorUserID,
		Playing:           false,
		Users:             []string{fakeRoomCreatorUserID},
		Name:              faker.Word(),
		TracksIDsList:     tracksIDs,
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
		activities.PlayActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil)
	s.env.OnActivity(
		activities.PauseActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil)

	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.ControlState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.False(mtvState.Playing)
	}, 1*time.Second)

	s.env.RegisterDelayedCallback(func() {
		playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{})

		s.env.SignalWorkflow(shared.SignalChannelName, playSignal)
	}, 2*time.Second)
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.ControlState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.True(mtvState.Playing)
	}, 3*time.Second)

	s.env.RegisterDelayedCallback(func() {
		pauseSignal := shared.NewPauseSignal(shared.NewPauseSignalArgs{})

		s.env.SignalWorkflow(shared.SignalChannelName, pauseSignal)
	}, 4*time.Second)
	s.env.RegisterDelayedCallback(func() {
		var mtvState shared.ControlState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.False(mtvState.Playing)
	}, 5*time.Second)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, state)

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
	state := shared.ControlState{
		RoomID:            fakeWorkflowID,
		RoomCreatorUserID: fakeRoomCreatorUserID,
		Playing:           false,
		Users:             []string{fakeRoomCreatorUserID},
		Name:              faker.Word(),
		TracksIDsList:     tracksIDs,
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
		var mtvState shared.ControlState

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
		var mtvState shared.ControlState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.Len(mtvState.Users, 2)
	}, 3*time.Second)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, state)

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
	state := shared.ControlState{
		RoomID:            fakeWorkflowID,
		RoomCreatorUserID: fakeUserID,
		Playing:           false,
		Users:             []string{fakeUserID},
		Name:              faker.Word(),
		TracksIDsList:     []string{tracksList[0].ID, tracksList[1].ID},
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
		var mtvState shared.ControlState

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
		var mtvState shared.ControlState

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
		var mtvState shared.ControlState

		res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
		s.NoError(err)

		err = res.Get(&mtvState)
		s.NoError(err)

		s.False(mtvState.Playing)
		s.Equal(tracksList[1], mtvState.CurrentTrack)
		s.Len(mtvState.Tracks, 0)
		s.Len(mtvState.TracksIDsList, 0)
	}, tracksList[0].Duration+1*time.Millisecond+tracksList[1].Duration+1*time.Millisecond)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, state)

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
