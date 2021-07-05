package activities_test

import (
	"context"
	"testing"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/stretchr/testify/suite"
	"go.temporal.io/sdk/activity"
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

func loggerActivity(ctx context.Context, value bool) (bool, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("test logging")
	return value, nil
}

// func (s *UnitTestSuite) Test_Logger() {
// 	s.env.RegisterActivity(loggerActivity)
// 	val, err := s.env.ExecuteActivity(loggerActivity, true)
// 	s.Nil(err)
// 	var ptr bool
// 	s.NoError(val.Get(&ptr))
// 	s.True(ptr)
// }
func (s *UnitTestSuite) Test_TracksTimer() {
	ctx := context.WithValue(context.Background(), "foo", "bar")
	ctx, cancel := context.WithCancel(ctx)
	timer := shared.MtvRoomTimer{
		State:         shared.MtvRoomTimerStateIdle,
		Elapsed:       0,
		TotalDuration: 10 * time.Second,
	}

	s.env.RegisterActivity(activities.TrackTimerActivity)
	s.env.SetWorkerOptions(worker.Options{
		BackgroundActivityContext: ctx,
	})
	val, err := s.env.ExecuteActivity(activities.TrackTimerActivity, timer)
	cancel()
	s.NoError(err)
	var ptr shared.MtvRoomTimer
	err = val.Get(&ptr)
	s.T().Logf("%+v\n", ptr)
	s.NoError(err)
}

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}
