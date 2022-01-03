package mpe

import (
	"errors"
	"testing"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	activities_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/activities"
	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	"github.com/AdonisEnProvence/MusicRoom/random"
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
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
	}
	params, _ := s.getWorkflowInitParams(initialTracksIDs)
	var a *activities_mpe.Activities

	tracks := []shared.TrackMetadata{
		{
			ID:         initialTracksIDs[0],
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
		initialTracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.MpeCreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	checkOnlyOneUser := defaultDuration * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

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

func (s *CreateMpeWorkflowTestUnit) Test_CreateMpeWorkflowWithSeveralInitialTracksIDs() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	params, _ := s.getWorkflowInitParams(initialTracksIDs)
	var a *activities_mpe.Activities

	tracks := []shared.TrackMetadata{
		{
			ID:         initialTracksIDs[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
		},
		{
			ID:         initialTracksIDs[1],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
		},
		{
			ID:         initialTracksIDs[2],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
		},
		{
			ID:         initialTracksIDs[3],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
		},
	}

	defaultDuration := 200 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.MpeCreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	checkOnlyOneUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)
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

	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
	}
	params, _ := s.getWorkflowInitParams(initialTracksIDs)
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

	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
	}
	params, _ := s.getWorkflowInitParams(initialTracksIDs)
	params.InitialTracksIDs = []string{}

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
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
	}
	params, _ := s.getWorkflowInitParams(initialTracksIDs)

	defaultDuration := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(nil, nil).Once()

	checkOnlyOneUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

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

func (s *CreateMpeWorkflowTestUnit) Test_MtvRoomPanicAfterUnkownWorkflowSignal() {
	var a *activities_mpe.Activities

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	initialTracksIDs := []string{tracks[0].ID}

	params, _ := s.getWorkflowInitParams(initialTracksIDs)
	defaultDuration := 200 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.MpeCreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitUnkownSignal()
	}, init)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.Error(err)
	var panicError *temporal.PanicError
	s.True(errors.As(err, &panicError))
	s.Contains(panicError.Error(), ErrUnknownWorflowSignal.Error())
}

func TestCreateMpeWorkflowTestSuite(t *testing.T) {
	suite.Run(t, new(CreateMpeWorkflowTestUnit))
}
