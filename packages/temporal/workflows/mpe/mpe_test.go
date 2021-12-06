package mpe

import (
	"fmt"
	"testing"
	"time"

	shared_mpe "github.com/AdonisEnProvence/MusicRoom/shared/mpe"
	"github.com/AdonisEnProvence/MusicRoom/workflows/mocks"
	"github.com/bxcodec/faker/v3"
	"github.com/stretchr/testify/suite"
	"go.temporal.io/sdk/testsuite"
	"go.temporal.io/sdk/workflow"
)

//Tests setup
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

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}

///

//Tests tools

func getWorkflowInitParams(tracksID string) (shared_mpe.MpeRoomParameters, string) {
	var (
		workflowID          = faker.UUIDHyphenated()
		roomCreatorUserID   = faker.UUIDHyphenated()
		roomCreatorDeviceID = faker.UUIDHyphenated()
	)

	creatorUserRelatedInformation := &shared_mpe.InternalStateUser{
		UserID:             roomCreatorUserID,
		UserHasBeenInvited: false,
	}

	return shared_mpe.MpeRoomParameters{
		RoomID:                        workflowID,
		RoomCreatorUserID:             roomCreatorUserID,
		RoomName:                      faker.Word(),
		CreatorUserRelatedInformation: creatorUserRelatedInformation,
		IsOpen:                        true,
		IsOpenOnlyInvitedUsersCanEdit: false,
	}, roomCreatorDeviceID
}

func (s *UnitTestSuite) getMtvState(userID string) shared_mpe.MpeRoomExposedState {
	var mtvState shared_mpe.MpeRoomExposedState

	res, err := s.env.QueryWorkflow(shared_mpe.MpeGetStateQuery, userID)
	s.NoError(err)

	err = res.Get(&mtvState)
	s.NoError(err)

	return mtvState
}

///

// Test_JoinCreatedRoom scenario:
func (s *UnitTestSuite) Test_CreateMpeWorkflow() {
	params, _ := getWorkflowInitParams("just a track id")

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
