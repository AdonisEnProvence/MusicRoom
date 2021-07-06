package activities

import (
	"context"
	"testing"
	"time"

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
	originalImplementation := RecordHeartbeatWrapper
	heartBeatCount := 0
	RecordHeartbeatWrapper = func(ctx context.Context, details ...interface{}) {
		heartBeatCount += 1
	}
	defer func() {
		RecordHeartbeatWrapper = originalImplementation
	}()

	ctx := context.Background()
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
	s.Equal(2, heartBeatCount)
}

// Couldn't test corectly with context cancelation in the temporal TestActivityEnvironment
func (s *UnitTestSuite) Test_Cancel_Tracks_Timer() {

	originalImplementation := RecordHeartbeatWrapper
	RecordHeartbeatWrapper = func(ctx context.Context, details ...interface{}) {
	}
	defer func() {
		RecordHeartbeatWrapper = originalImplementation
	}()

	ctx, cancel := context.WithCancel(context.Background())
	totalDuration := 3 * time.Second
	durationBeforeCancel := 1 * time.Second
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
