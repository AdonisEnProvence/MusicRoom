// @@@SNIPSTART hello-world-project-template-go-workflow-test
package app

import (
	"fmt"
	"testing"
	"time"

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
	state := ControlState{Playing: true, Users: make([]string, 0), Name: "RoomA"}

	s.env.RegisterDelayedCallback(func() {
		otherUpdate := PauseSignal{
			Route: RouteTypes.PAUSE,
		}
		s.env.SignalWorkflow("control", otherUpdate)
	}, time.Millisecond*0)

	s.env.ExecuteWorkflow(ControlWorkflow, state)

	res, err := s.env.QueryWorkflow("getState")
	s.NoError(err)
	err = res.Get(&state)
	fmt.Println(state)
	s.NoError(err)
	s.False(state.Playing)
	s.True(s.env.IsWorkflowCompleted())
}

func (s *UnitTestSuite) Test_PLAY() {
	state := ControlState{Playing: false, Users: make([]string, 0), Name: "RoomA"}

	s.env.RegisterDelayedCallback(func() {
		update := PlaySignal{
			Route: RouteTypes.PLAY,
		}
		s.env.SignalWorkflow(SignalChannelName, update)
	}, time.Millisecond*0)

	s.env.ExecuteWorkflow(ControlWorkflow, state)

	res, err := s.env.QueryWorkflow("getState")
	s.NoError(err)
	err = res.Get(&state)
	s.NoError(err)
	s.True(state.Playing)
	s.True(s.env.IsWorkflowCompleted())
}

func (s *UnitTestSuite) Test_JOIN() {
	state := ControlState{Playing: false, Users: make([]string, 0), Name: "RoomA"}

	s.env.RegisterDelayedCallback(func() {
		update := JoinSignal{
			Route:  RouteTypes.JOIN,
			UserID: "UserA",
		}
		s.env.SignalWorkflow(SignalChannelName, update)
	}, time.Millisecond*0)

	s.env.ExecuteWorkflow(ControlWorkflow, state)

	res, err := s.env.QueryWorkflow("getState")
	s.NoError(err)
	err = res.Get(&state)
	s.NoError(err)
	s.False(state.Playing)
	s.Equal(1, len(state.Users))
	s.Equal("UserA", state.Users[0])
	s.True(s.env.IsWorkflowCompleted())
}

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}

// @@@SNIPEND
