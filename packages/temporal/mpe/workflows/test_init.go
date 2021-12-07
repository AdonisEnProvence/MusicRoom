package mpe

import (
	"fmt"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/mocks"
	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	"github.com/bxcodec/faker/v3"
	"github.com/stretchr/testify/suite"
	"go.temporal.io/sdk/testsuite"
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

///

//Tests tools

func (s *UnitTestSuite) getWorkflowInitParams(tracksID string) (shared_mpe.MpeRoomParameters, string) {
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
