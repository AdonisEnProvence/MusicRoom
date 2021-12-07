package mpe

import (
	"testing"
	"time"

	shared_mpe "github.com/AdonisEnProvence/MusicRoom/shared/mpe"
	"github.com/stretchr/testify/suite"
	"go.temporal.io/sdk/workflow"
)

type CreateMpeWorkflowTestUnit struct {
	UnitTestSuite
}

// Test_JoinCreatedRoom scenario:
func (s *CreateMpeWorkflowTestUnit) Test_CreateMpeWorkflow() {
	params, _ := s.getWorkflowInitParams("just a track id")

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	checkOnlyOneUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMtvState(shared_mpe.NoRelatedUserID)

		expectedExposedMpeState := shared_mpe.MpeRoomExposedState{
			IsOpen:                        params.IsOpen,
			IsOpenOnlyInvitedUsersCanEdit: params.IsOpenOnlyInvitedUsersCanEdit,
			RoomCreatorUserID:             params.RoomCreatorUserID,
			RoomID:                        params.RoomID,
			RoomName:                      params.RoomName,
			UsersLength:                   1,
		}

		s.Equal(expectedExposedMpeState, mpeState)
	}, checkOnlyOneUser)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(CreateMpeWorkflowTestUnit))
}
