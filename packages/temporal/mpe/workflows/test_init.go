package mpe

import (
	"fmt"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/mocks"
	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	"github.com/AdonisEnProvence/MusicRoom/shared"
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

func (s *UnitTestSuite) getWorkflowInitParams(tracksIDs []string) (shared_mpe.MpeRoomParameters, string) {
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
		InitialTracksIDs:              tracksIDs,
	}, roomCreatorDeviceID
}

func (s *UnitTestSuite) getMpeState(userID string) shared_mpe.MpeRoomExposedState {
	var mpeState shared_mpe.MpeRoomExposedState

	res, err := s.env.QueryWorkflow(shared_mpe.MpeGetStateQuery, userID)
	s.NoError(err)

	err = res.Get(&mpeState)
	s.NoError(err)

	return mpeState
}

func (s *UnitTestSuite) emitAddTrackSignal(args shared_mpe.NewAddTracksSignalArgs) {
	addTracksSignal := shared_mpe.NewAddTracksSignal(args)
	s.env.SignalWorkflow(shared_mpe.SignalChannelName, addTracksSignal)
}

func (s *UnitTestSuite) emitChangeTrackOrder(args shared_mpe.NewChangeTrackOrderSignalArgs) {
	changeTrackOrderSignal := shared_mpe.NewChangeTrackOrderSignal(args)
	s.env.SignalWorkflow(shared_mpe.SignalChannelName, changeTrackOrderSignal)
}

func (s *UnitTestSuite) emitUnkownSignal() {
	fmt.Println("-----EMIT UNKOWN SIGNAL CALLED IN TEST-----")
	unkownSignal := struct {
		Route shared.SignalRoute `validate:"required"`
	}{
		Route: "UnknownOperation",
	}

	s.env.SignalWorkflow(shared_mpe.SignalChannelName, unkownSignal)
}

func IndexOfTrackMedata(array []shared.TrackMetadata, trackToFind shared.TrackMetadata) int {
	for index, track := range array {
		if track.ID == trackToFind.ID {
			return index
		}
	}

	return -1
}

///
