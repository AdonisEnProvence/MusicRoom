package mpe

import (
	"errors"
	"testing"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	activities_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/activities"
	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/bxcodec/faker/v3"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

type CreateMpeWorkflowTestUnit struct {
	UnitTestSuite
}

func (s *CreateMpeWorkflowTestUnit) Test_CreateMpeWorkflow() {
	params, _ := s.getWorkflowInitParams("just a track id")
	tracksIDs := []string{
		params.InitialTrackID,
	}
	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
		},
	}

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		activities_mpe.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	checkOnlyOneUser := defaultDuration * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMtvState(shared_mpe.NoRelatedUserID)

		expectedTracks := tracks
		expectedExposedMpeState := shared_mpe.MpeRoomExposedState{
			IsOpen:                        params.IsOpen,
			IsOpenOnlyInvitedUsersCanEdit: params.IsOpenOnlyInvitedUsersCanEdit,
			RoomCreatorUserID:             params.RoomCreatorUserID,
			RoomID:                        params.RoomID,
			RoomName:                      params.RoomName,
			UsersLength:                   1,
			Tracks:                        expectedTracks,
			PlaylistTotalDuration:         42000, //tmp
		}

		s.Equal(expectedExposedMpeState, mpeState)
	}, checkOnlyOneUser)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *CreateMpeWorkflowTestUnit) Test_CreateMpeWorkflowFailIsOpenOnlyInvitedUsersCanEditTrueButIsOpenFalse() {

	params, _ := s.getWorkflowInitParams("just a track id")
	params.IsOpenOnlyInvitedUsersCanEdit = true
	params.IsOpen = false

	resetMock, _ := s.initTestEnv()

	defer resetMock()

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Error(err)
	var applicationErr *temporal.ApplicationError
	s.True(errors.As(err, &applicationErr))
	s.Equal("IsOpenOnlyInvitedUsersCanEdit true but IsOpen false", applicationErr.Error())
}

//Below testing only initialTrackID but also parsing others params field in reality
func (s *CreateMpeWorkflowTestUnit) Test_CreateMpeWorkflowFailValidateParamsFailed() {

	params, _ := s.getWorkflowInitParams("just a track id")
	params.InitialTrackID = ""

	resetMock, _ := s.initTestEnv()

	defer resetMock()

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Error(err)
	var applicationErr *temporal.ApplicationError
	s.True(errors.As(err, &applicationErr))
	s.Equal("validate params failed", applicationErr.Error())
}

func (s *CreateMpeWorkflowTestUnit) Test_CreateMpeWorkflowFetchInitialTrackFailed() {
	params, _ := s.getWorkflowInitParams("just a track id")
	tracksIDs := []string{
		params.InitialTrackID,
	}

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		tracksIDs,
	).Return(nil, nil).Once()

	checkOnlyOneUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMtvState(shared_mpe.NoRelatedUserID)

		expectedTracks := []shared.TrackMetadata{}
		expectedExposedMpeState := shared_mpe.MpeRoomExposedState{
			IsOpen:                        params.IsOpen,
			IsOpenOnlyInvitedUsersCanEdit: params.IsOpenOnlyInvitedUsersCanEdit,
			RoomCreatorUserID:             params.RoomCreatorUserID,
			RoomID:                        params.RoomID,
			RoomName:                      params.RoomName,
			UsersLength:                   1,
			Tracks:                        expectedTracks,
			PlaylistTotalDuration:         42000, //tmp
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
