package workflows_test

import (
	"adonis-en-provence/music_room/activities"
	"adonis-en-provence/music_room/shared"
	"adonis-en-provence/music_room/workflows"
	"fmt"
	"testing"
	"time"

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

func (s *UnitTestSuite) Test_PAUSE() {
	const fakeWorkflowID = "worflow id"

	state := shared.ControlState{Playing: true, Users: []string{}, Name: "RoomA"}

	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil)

	s.env.RegisterDelayedCallback(func() {
		signal := shared.NewPauseSignal(shared.NewPauseSignalArgs{
			WorkflowID: fakeWorkflowID,
		})

		s.env.SignalWorkflow("control", signal)
	}, time.Millisecond*0)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, state)

	res, err := s.env.QueryWorkflow("getState")
	s.NoError(err)
	err = res.Get(&state)
	fmt.Println(state)
	s.NoError(err)
	s.False(state.Playing)
	s.True(s.env.IsWorkflowCompleted())
}

func (s *UnitTestSuite) Test_PLAY() {
	const fakeWorkflowID = "worflow id"

	state := shared.ControlState{Playing: false, Users: []string{}, Name: "RoomA"}

	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
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

	res, err := s.env.QueryWorkflow("getState")
	s.NoError(err)
	err = res.Get(&state)
	s.NoError(err)
	s.True(state.Playing)
	s.True(s.env.IsWorkflowCompleted())
}

func (s *UnitTestSuite) Test_JOIN() {
	const (
		fakeWorkflowID = "worflow id"
		fakeUserID     = "user id"
	)

	state := shared.ControlState{Playing: false, Users: []string{}, Name: "RoomA"}

	s.env.OnActivity(
		activities.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil)

	s.env.RegisterDelayedCallback(func() {
		signal := shared.NewJoinSignal(shared.NewJoinSignalArgs{
			WorkflowID: fakeWorkflowID,
			UserID:     fakeUserID,
		})

		s.env.SignalWorkflow(shared.SignalChannelName, signal)
	}, time.Millisecond*0)

	s.env.ExecuteWorkflow(workflows.MtvRoomWorkflow, state)

	res, err := s.env.QueryWorkflow("getState")
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
