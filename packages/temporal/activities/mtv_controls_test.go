package activities

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/mock"

	"github.com/AdonisEnProvence/MusicRoom/activities/mocks"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/stretchr/testify/suite"
	"go.temporal.io/sdk/testsuite"
	"go.temporal.io/sdk/worker"
)

type UnitTestSuite struct {
	suite.Suite
	testsuite.WorkflowTestSuite

	env *testsuite.TestActivityEnvironment
}

func (s *UnitTestSuite) SetupTest() {
	s.env = s.NewTestActivityEnvironment()
}

func (s *UnitTestSuite) AfterTest(suiteName, testName string) {
	s.env = s.NewTestActivityEnvironment()
}

func (s *UnitTestSuite) Test_Timeout_Tracks_Timer() {
	ctx := context.Background()
	// ctx, cancel := context.WithCancel(ctx)
	totalDuration := 4 * time.Second
	timer := shared.MtvRoomTimer{
		State:         shared.MtvRoomTimerStateIdle,
		Elapsed:       0,
		TotalDuration: totalDuration,
	}

	s.env.RegisterActivity(TrackTimerActivity)
	s.env.SetWorkerOptions(worker.Options{
		BackgroundActivityContext: ctx,
	})
	val, err := s.env.ExecuteActivity(TrackTimerActivity, timer)
	s.NoError(err)

	var res shared.MtvRoomTimer
	err = val.Get(&res)
	s.NoError(err)

	expectedResult := shared.MtvRoomTimer{
		State:         shared.MtvRoomTimerStateFinished,
		Elapsed:       totalDuration,
		TotalDuration: totalDuration,
	}

	s.Equal(res, expectedResult)
}

func (s *UnitTestSuite) Test_Heartbeat_Tracks_Timer() {
	ctx := context.Background()

	originalImplementation := RecordHeartbeatWrapper
	heartbeatMock := new(mocks.RecordHeartbeatWrapperType)
	heartbeatMock.On("Execute", ctx, mock.Anything)
	RecordHeartbeatWrapper = heartbeatMock.Execute
	defer func() {
		RecordHeartbeatWrapper = originalImplementation
	}()

	totalDuration := 6 * time.Second
	timer := shared.MtvRoomTimer{
		State:         shared.MtvRoomTimerStateIdle,
		Elapsed:       0,
		TotalDuration: totalDuration,
	}

	res, err := TrackTimerActivity(ctx, timer)
	s.NoError(err)

	expectedResult := shared.MtvRoomTimer{
		State:         shared.MtvRoomTimerStateFinished,
		Elapsed:       totalDuration,
		TotalDuration: totalDuration,
	}
	res.Elapsed = res.Elapsed.Round(time.Second * 1)

	s.Equal(expectedResult, res)
	//2 because last heartbeat call will be avoid by the timeout channel
	heartbeatMock.AssertNumberOfCalls(s.T(), "Execute", 2)
}

// Couldn't test corectly with context cancelation in the temporal TestActivityEnvironment
func (s *UnitTestSuite) Test_Cancel_Tracks_Timer() {
	ctx, cancel := context.WithCancel(context.Background())

	originalImplementation := RecordHeartbeatWrapper
	heartbeatMock := new(mocks.RecordHeartbeatWrapperType)
	heartbeatMock.On("Execute", ctx, mock.Anything)
	RecordHeartbeatWrapper = heartbeatMock.Execute
	defer func() {
		RecordHeartbeatWrapper = originalImplementation
	}()

	totalDuration := 4 * time.Second
	durationBeforeCancel := 3 * time.Second
	timer := shared.MtvRoomTimer{
		State:         shared.MtvRoomTimerStateIdle,
		Elapsed:       0,
		TotalDuration: totalDuration,
	}

	go func() {
		time.Sleep(durationBeforeCancel)
		cancel()
	}()
	res, err := TrackTimerActivity(ctx, timer)
	s.NoError(err)

	expectedResult := shared.MtvRoomTimer{
		State:         shared.MtvRoomTimerStatePending,
		Elapsed:       durationBeforeCancel,
		TotalDuration: totalDuration,
	}
	res.Elapsed = res.Elapsed.Round(time.Second * 1)

	s.Equal(res, expectedResult)
}

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}
