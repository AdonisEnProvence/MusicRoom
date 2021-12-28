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

type DeleteTracksTestSuite struct {
	UnitTestSuite
}

func (s *DeleteTracksTestSuite) Test_DeleteTracksAndSendAcknowledgement() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	params, roomCreatorDeviceID := s.getWorkflowInitParams(initialTracksIDs)
	var a *activities_mpe.Activities

	initialTracksMetadata := []shared.TrackMetadata{
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
	}

	tick := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	// Common activities calls
	s.env.OnActivity(
		a.MpeCreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(initialTracksMetadata, nil).Once()

	// Specific activities calls
	s.env.OnActivity(
		a.AcknowledgeDeletingTracksActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	initialTracksFetched := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	deleteTracks := tick * 200
	registerDelayedCallbackWrapper(func() {
		s.emitDeleteTracksSignal(shared_mpe.NewDeleteTracksSignalArgs{
			TracksIDs: initialTracksIDs,
			UserID:    params.RoomCreatorUserID,
			DeviceID:  roomCreatorDeviceID,
		})
	}, deleteTracks)

	checkDeletedTracks := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Empty(mpeState.Tracks)
	}, checkDeletedTracks)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *DeleteTracksTestSuite) Test_PreventUnknownUserFromDeletingTracks() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	params, _ := s.getWorkflowInitParams(initialTracksIDs)
	var a *activities_mpe.Activities

	initialTracksMetadata := []shared.TrackMetadata{
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
	}

	tick := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	// Common activities calls
	s.env.OnActivity(
		a.MpeCreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(initialTracksMetadata, nil).Once()

	// Specific activities calls
	s.env.OnActivity(
		a.AcknowledgeDeletingTracksActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()

	initialTracksFetched := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	deleteTracks := tick * 200
	registerDelayedCallbackWrapper(func() {
		unknownUserID := faker.UUIDHyphenated()
		unknownDeviceID := faker.UUIDHyphenated()

		s.emitDeleteTracksSignal(shared_mpe.NewDeleteTracksSignalArgs{
			TracksIDs: initialTracksIDs,
			UserID:    unknownUserID,
			DeviceID:  unknownDeviceID,
		})
	}, deleteTracks)

	checkDeletedTracks := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, checkDeletedTracks)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *DeleteTracksTestSuite) Test_AcknowledgeDeletionEvenWhenNoTracksWereDeleted() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	params, roomCreatorDeviceID := s.getWorkflowInitParams(initialTracksIDs)
	var a *activities_mpe.Activities

	initialTracksMetadata := []shared.TrackMetadata{
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
	}

	tick := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	// Common activities calls
	s.env.OnActivity(
		a.MpeCreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(initialTracksMetadata, nil).Once()

	// Specific activities calls
	s.env.OnActivity(
		a.AcknowledgeDeletingTracksActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	initialTracksFetched := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	deleteTracks := tick * 200
	registerDelayedCallbackWrapper(func() {
		tracksIDsToDelete := []string{
			faker.UUIDHyphenated(),
			faker.UUIDHyphenated(),
		}

		s.emitDeleteTracksSignal(shared_mpe.NewDeleteTracksSignalArgs{
			TracksIDs: tracksIDsToDelete,
			UserID:    params.RoomCreatorUserID,
			DeviceID:  roomCreatorDeviceID,
		})
	}, deleteTracks)

	checkDeletedTracks := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, checkDeletedTracks)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *DeleteTracksTestSuite) Test_InRoomWithConstraintsCreatorCanDeleteTracks() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	params, roomCreatorDeviceID := s.getWorkflowInitParams(initialTracksIDs)
	params.IsOpenOnlyInvitedUsersCanEdit = true
	var a *activities_mpe.Activities

	initialTracksMetadata := []shared.TrackMetadata{
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
	}

	tick := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	// Common activities calls
	s.env.OnActivity(
		a.MpeCreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(initialTracksMetadata, nil).Once()

	// Specific activities calls
	s.env.OnActivity(
		a.AcknowledgeDeletingTracksActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	initialTracksFetched := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	creatorDeletesTracks := tick * 200
	registerDelayedCallbackWrapper(func() {
		s.emitDeleteTracksSignal(shared_mpe.NewDeleteTracksSignalArgs{
			TracksIDs: initialTracksIDs,
			UserID:    params.RoomCreatorUserID,
			DeviceID:  roomCreatorDeviceID,
		})
	}, creatorDeletesTracks)

	checkDeletedTracks := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Empty(mpeState.Tracks)
	}, checkDeletedTracks)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *DeleteTracksTestSuite) Test_InRoomWithConstraintsOnlyInvitedUsersCanDeleteTracks() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	var (
		invitedUserID       = faker.UUIDHyphenated()
		invitedUserDeviceID = faker.UUIDHyphenated()
		joiningUserID       = faker.UUIDHyphenated()
		joiningUserDeviceID = faker.UUIDHyphenated()
	)
	params, _ := s.getWorkflowInitParams(initialTracksIDs)
	params.IsOpenOnlyInvitedUsersCanEdit = true
	var a *activities_mpe.Activities

	initialTracksMetadata := []shared.TrackMetadata{
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

	tick := 1 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	// Common activities calls
	s.env.OnActivity(
		a.MpeCreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(initialTracksMetadata, nil).Once()

	// Specific activities calls
	s.env.OnActivity(
		a.AcknowledgeDeletingTracksActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		a.AcknowledgeJoinActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Twice()

	initialTracksFetched := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	addInvitedUser := tick * 200
	registerDelayedCallbackWrapper(func() {
		s.emitAddUserSignal(shared_mpe.NewAddUserSignalArgs{
			UserID:             invitedUserID,
			UserHasBeenInvited: true,
		})
	}, addInvitedUser)

	checkAddInvitedUserWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(2, mpeState.UsersLength)
	}, checkAddInvitedUserWorked)

	addJoiningUser := tick
	registerDelayedCallbackWrapper(func() {
		s.emitAddUserSignal(shared_mpe.NewAddUserSignalArgs{
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		})
	}, addJoiningUser)

	checkJoinWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(3, mpeState.UsersLength)
	}, checkJoinWorked)

	invitedUserDeletesTrack := tick
	registerDelayedCallbackWrapper(func() {
		s.emitDeleteTracksSignal(shared_mpe.NewDeleteTracksSignalArgs{
			TracksIDs: []string{initialTracksIDs[0]},
			UserID:    invitedUserID,
			DeviceID:  invitedUserDeviceID,
		})
	}, invitedUserDeletesTrack)

	checkDeletedTracks := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(3, len(mpeState.Tracks))
	}, checkDeletedTracks)

	joiningUserDeletesTrack := tick
	registerDelayedCallbackWrapper(func() {
		s.emitDeleteTracksSignal(shared_mpe.NewDeleteTracksSignalArgs{
			TracksIDs: []string{initialTracksIDs[1]},
			UserID:    joiningUserID,
			DeviceID:  joiningUserDeviceID,
		})
	}, joiningUserDeletesTrack)

	checkJoiningUserDeleteTracksNotWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(3, len(mpeState.Tracks))
	}, checkJoiningUserDeleteTracksNotWorked)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func TestDeleteTracksTestSuite(t *testing.T) {
	suite.Run(t, new(DeleteTracksTestSuite))
}
