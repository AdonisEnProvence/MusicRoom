package mpe

import (
	"testing"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	activities_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/activities"
	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/bxcodec/faker/v3"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
	"go.temporal.io/sdk/workflow"
)

type AddUserMpeWorkflowTestUnit struct {
	UnitTestSuite
}

func (s *AddUserMpeWorkflowTestUnit) Test_AddUser() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
	}
	var joiningUserID = faker.UUIDHyphenated()
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
	s.env.OnActivity(
		a.AcknowledgeJoinActivity,
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

	addUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitAddUserSignal(shared_mpe.NewAddUserSignalArgs{
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		})
	}, addUser)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(2, mpeState.UsersLength)
	}, checkJoinWorked)

	addSameUserAgain := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitAddUserSignal(shared_mpe.NewAddUserSignalArgs{
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		})
	}, addSameUserAgain)

	checkJoinNotWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(2, mpeState.UsersLength)
	}, checkJoinNotWorked)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func TestAddUserUnitTestSuite(t *testing.T) {
	suite.Run(t, new(AddUserMpeWorkflowTestUnit))
}
