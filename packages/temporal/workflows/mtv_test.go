package workflows_test

import (
	"adonis-en-provence/music_room/activities"
	"adonis-en-provence/music_room/shared"
	"adonis-en-provence/music_room/workflows"
	"fmt"
	"math/rand"
	"testing"
	"time"

	"github.com/bxcodec/faker/v3"
	"github.com/senseyeio/duration"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
	"go.temporal.io/sdk/testsuite"
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

func (s *UnitTestSuite) Test_PlayTrack() {
	fakeWorkflowID := faker.UUIDHyphenated()

	state := shared.ControlState{
		Playing: false,
		Users:   []string{},
		Name:    faker.Word(),
	}

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		mock.Anything,
	).Return([]shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   generateRandomDuration(),
		},
	}, nil)
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

	s.env.RegisterDelayedCallback(func() {
		signal := shared.NewPlaySignal(shared.NewPlaySignalArgs{
			WorkflowID: fakeWorkflowID,
		})

		s.env.SignalWorkflow(shared.SignalChannelName, signal)
	}, time.Millisecond*0)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, state)

	res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
	s.NoError(err)
	err = res.Get(&state)
	s.NoError(err)
	s.True(state.Playing)
	s.True(s.env.IsWorkflowCompleted())
}

func (s *UnitTestSuite) Test_PlayThenPauseTrack() {
	fakeWorkflowID := faker.UUIDHyphenated()

	state := shared.ControlState{
		Playing: false,
		Users:   []string{},
		Name:    faker.Word(),
	}

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		mock.Anything,
	).Return([]shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   generateRandomDuration(),
		},
	}, nil)
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
		playSignal := shared.NewPlaySignal(shared.NewPlaySignalArgs{
			WorkflowID: fakeWorkflowID,
		})
		s.env.SignalWorkflow(shared.SignalChannelName, playSignal)

	}, time.Millisecond*0)

	s.env.RegisterDelayedCallback(func() {
		pauseSignal := shared.NewPauseSignal(shared.NewPauseSignalArgs{
			WorkflowID: fakeWorkflowID,
		})
		s.env.SignalWorkflow(shared.SignalChannelName, pauseSignal)
	}, time.Second*2)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, state)

	res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
	s.NoError(err)
	err = res.Get(&state)
	fmt.Println(state)
	s.NoError(err)
	s.False(state.Playing)
	s.True(s.env.IsWorkflowCompleted())
}

func (s *UnitTestSuite) Test_JoinCreatedRoom() {
	var (
		fakeWorkflowID = faker.UUIDHyphenated()
		fakeUserID     = faker.UUIDHyphenated()
	)

	state := shared.ControlState{
		Playing: false,
		Users:   []string{},
		Name:    faker.Word(),
	}

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		mock.Anything,
	).Return([]shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   generateRandomDuration(),
		},
	}, nil)
	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil)
	s.env.OnActivity(
		activities.JoinActivity,
		mock.Anything,
		mock.Anything,
		mock.Anything,
		mock.Anything,
	).Return(nil)

	s.env.RegisterDelayedCallback(func() {
		signal := shared.NewJoinSignal(shared.NewJoinSignalArgs{
			WorkflowID: fakeWorkflowID,
			UserID:     fakeUserID,
		})

		s.env.SignalWorkflow(shared.SignalChannelName, signal)
	}, time.Second*10)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, state)

	res, err := s.env.QueryWorkflow(shared.MtvGetStateQuery)
	s.NoError(err)
	err = res.Get(&state)
	s.NoError(err)
	s.False(state.Playing)
	s.Equal(1, len(state.Users))
	s.Equal(fakeUserID, state.Users[0])
	s.True(s.env.IsWorkflowCompleted())
}

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}

func generateRandomDuration() duration.Duration {
	return duration.Duration{
		TM: rand.Intn(10),
		TS: rand.Intn(59),
	}
}
