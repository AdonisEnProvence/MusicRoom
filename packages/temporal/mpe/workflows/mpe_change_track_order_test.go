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

type ChangeTrackOrderPlaylistTestSuite struct {
	UnitTestSuite
}

func (s *ChangeTrackOrderPlaylistTestSuite) Test_ChangeTrackOrderDownAndUp() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
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
		{
			ID:         initialTracksIDs[2],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
		},
	}

	tick := 200 * time.Millisecond
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
		a.AcknowledgeChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)

	s.env.OnActivity(
		a.RejectChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()
	///

	initialTracksFetched := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	trackToChangeOrder := initialTracksMetadata[0]
	changeTrackOrderDown := tick
	registerDelayedCallbackWrapper(func() {
		args := shared_mpe.NewChangeTrackOrderSignalArgs{
			DeviceID:         roomCreatorDeviceID,
			FromIndex:        0,
			TrackID:          trackToChangeOrder.ID,
			UserID:           params.RoomCreatorUserID,
			OperationToApply: shared_mpe.MpeOperationToApplyDown,
		}
		s.emitChangeTrackOrder(args)
	}, changeTrackOrderDown)

	checkChangeTrackOrderDownWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		expectedIndex := 1
		currentIndex := IndexOfTrackMedata(mpeState.Tracks, trackToChangeOrder)

		s.Equal(expectedIndex, currentIndex)

		expectedPreviousSecondTracksElementIndex := 0
		previousSecondTracksElementIndex := IndexOfTrackMedata(mpeState.Tracks, initialTracksMetadata[1])

		s.Equal(expectedPreviousSecondTracksElementIndex, previousSecondTracksElementIndex)
	}, checkChangeTrackOrderDownWorked)

	changeTrackOrderUp := tick
	registerDelayedCallbackWrapper(func() {
		args := shared_mpe.NewChangeTrackOrderSignalArgs{
			DeviceID:         roomCreatorDeviceID,
			FromIndex:        1,
			TrackID:          trackToChangeOrder.ID,
			UserID:           params.RoomCreatorUserID,
			OperationToApply: shared_mpe.MpeOperationToApplyUp,
		}
		s.emitChangeTrackOrder(args)
	}, changeTrackOrderUp)

	checkChangeTrackOrderUpWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		expectedIndex := 0
		currentIndex := IndexOfTrackMedata(mpeState.Tracks, trackToChangeOrder)

		s.Equal(expectedIndex, currentIndex)
		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, checkChangeTrackOrderUpWorked)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *ChangeTrackOrderPlaylistTestSuite) Test_ChangeTrackOrderDownFailWithIndexMaxAndMinLength() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
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
		{
			ID:         initialTracksIDs[2],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
		},
	}

	tick := 200 * time.Millisecond
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
		a.AcknowledgeChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()

	s.env.OnActivity(
		a.RejectChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Twice()
	///

	initialTracksFetched := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	trackToChangeOrderDown := initialTracksMetadata[2]
	changeTrackOrderDown := tick
	registerDelayedCallbackWrapper(func() {
		args := shared_mpe.NewChangeTrackOrderSignalArgs{
			DeviceID:         roomCreatorDeviceID,
			FromIndex:        2,
			TrackID:          trackToChangeOrderDown.ID,
			UserID:           params.RoomCreatorUserID,
			OperationToApply: shared_mpe.MpeOperationToApplyDown,
		}
		s.emitChangeTrackOrder(args)
	}, changeTrackOrderDown)

	checkChangeTrackDownFailed := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, checkChangeTrackDownFailed)

	trackToChangeOrderUp := initialTracksMetadata[0]
	changeTrackOrderUp := tick
	registerDelayedCallbackWrapper(func() {
		args := shared_mpe.NewChangeTrackOrderSignalArgs{
			DeviceID:         roomCreatorDeviceID,
			FromIndex:        0,
			TrackID:          trackToChangeOrderUp.ID,
			UserID:           params.RoomCreatorUserID,
			OperationToApply: shared_mpe.MpeOperationToApplyUp,
		}
		s.emitChangeTrackOrder(args)
	}, changeTrackOrderUp)

	checkChangeTrackUpFailed := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, checkChangeTrackUpFailed)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *ChangeTrackOrderPlaylistTestSuite) Test_ChangeTrackOrderUnkownOperation() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
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
		{
			ID:         initialTracksIDs[2],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
		},
	}

	tick := 200 * time.Millisecond
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
		a.AcknowledgeChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()

	s.env.OnActivity(
		a.RejectChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()
	///

	initialTracksFetched := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	trackToChangeOrderDown := initialTracksMetadata[2]
	changeTrackOrderDown := tick
	registerDelayedCallbackWrapper(func() {
		var unkownOperation shared_mpe.MpeOperationToApplyValue = "UnkownOperation"
		args := shared_mpe.NewChangeTrackOrderSignalArgs{
			DeviceID:         roomCreatorDeviceID,
			FromIndex:        2,
			TrackID:          trackToChangeOrderDown.ID,
			UserID:           params.RoomCreatorUserID,
			OperationToApply: unkownOperation,
		}
		s.emitChangeTrackOrder(args)
	}, changeTrackOrderDown)

	checkChangeTrackOrderDownDidnotWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, checkChangeTrackOrderDownDidnotWorked)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *ChangeTrackOrderPlaylistTestSuite) Test_ChangeTrackOrderUnkownTrack() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
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
		{
			ID:         initialTracksIDs[2],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
		},
	}

	tick := 200 * time.Millisecond
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
		a.AcknowledgeChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()

	s.env.OnActivity(
		a.RejectChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	///

	initialTracksFetched := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	changeTrackOrderDown := tick
	registerDelayedCallbackWrapper(func() {
		args := shared_mpe.NewChangeTrackOrderSignalArgs{
			DeviceID:         roomCreatorDeviceID,
			FromIndex:        2,
			TrackID:          faker.UUIDHyphenated(),
			UserID:           params.RoomCreatorUserID,
			OperationToApply: shared_mpe.MpeOperationToApplyUp,
		}
		s.emitChangeTrackOrder(args)
	}, changeTrackOrderDown)

	checkChangeTrackOrderDownDidnotWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, checkChangeTrackOrderDownDidnotWorked)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *ChangeTrackOrderPlaylistTestSuite) Test_ChangeTrackOrderTrackIndexIsOutdatedAkaInvalid() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
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
		{
			ID:         initialTracksIDs[2],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
		},
	}

	tick := 200 * time.Millisecond
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
		a.AcknowledgeChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()

	s.env.OnActivity(
		a.RejectChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	///

	initialTracksFetched := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	trackToChangeOrderDown := initialTracksIDs[0]
	changeTrackOrderDown := tick
	registerDelayedCallbackWrapper(func() {
		args := shared_mpe.NewChangeTrackOrderSignalArgs{
			DeviceID: roomCreatorDeviceID,
			//Index should be 0 to be a valid signal
			FromIndex:        1,
			TrackID:          trackToChangeOrderDown,
			UserID:           params.RoomCreatorUserID,
			OperationToApply: shared_mpe.MpeOperationToApplyDown,
		}
		s.emitChangeTrackOrder(args)
	}, changeTrackOrderDown)

	checkChangeTrackOrderDownDidnotWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, checkChangeTrackOrderDownDidnotWorked)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *ChangeTrackOrderPlaylistTestSuite) Test_ChangeTrackOrderTrackIndexOnlyInvitedUsersCanEditAndCreator() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
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
		{
			ID:         initialTracksIDs[2],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
		},
	}

	tick := 200 * time.Millisecond
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
		a.AcknowledgeChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	s.env.OnActivity(
		a.RejectChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()
	///

	initialTracksFetched := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	trackToChangeOrderDown := initialTracksMetadata[0]
	creatorChangeTrackOrderDown := tick
	registerDelayedCallbackWrapper(func() {
		args := shared_mpe.NewChangeTrackOrderSignalArgs{
			DeviceID: roomCreatorDeviceID,
			//Index should be 0 to be a valid signal
			FromIndex:        0,
			TrackID:          trackToChangeOrderDown.ID,
			UserID:           params.RoomCreatorUserID,
			OperationToApply: shared_mpe.MpeOperationToApplyDown,
		}
		s.emitChangeTrackOrder(args)
	}, creatorChangeTrackOrderDown)

	checkCreatorChangeTrackOrderDown := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		expectedTracks := initialTracksMetadata
		expectedTracks[0], expectedTracks[1] = expectedTracks[1], expectedTracks[0]

		s.Equal(expectedTracks, mpeState.Tracks)
	}, checkCreatorChangeTrackOrderDown)

	//TODO when addUser is implemented test that a not invited user cannot perform playlist editions operations

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *ChangeTrackOrderPlaylistTestSuite) Test_ChangeTrackOrderTrackUnknownUser() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	params, creatorDeviceID := s.getWorkflowInitParams(initialTracksIDs)
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
	}

	tick := 200 * time.Millisecond
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
		a.AcknowledgeChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()

	s.env.OnActivity(
		a.RejectChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	///

	initialTracksFetched := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	trackToChangeOrderDown := initialTracksIDs[0]
	changeTrackOrderDown := tick
	registerDelayedCallbackWrapper(func() {
		args := shared_mpe.NewChangeTrackOrderSignalArgs{
			DeviceID:         creatorDeviceID,
			FromIndex:        0,
			TrackID:          trackToChangeOrderDown,
			UserID:           faker.UUIDHyphenated(),
			OperationToApply: shared_mpe.MpeOperationToApplyDown,
		}
		s.emitChangeTrackOrder(args)
	}, changeTrackOrderDown)

	checkChangeTrackOrderDownDidnotWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, checkChangeTrackOrderDownDidnotWorked)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func TestChangeTrackOrderPlaylistTestSuite(t *testing.T) {
	suite.Run(t, new(ChangeTrackOrderPlaylistTestSuite))
}
