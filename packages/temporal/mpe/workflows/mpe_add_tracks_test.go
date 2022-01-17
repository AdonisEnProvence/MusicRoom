package mpe

import (
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
	"go.temporal.io/sdk/workflow"
)

type AddTracksTestSuite struct {
	UnitTestSuite
}

func (s *AddTracksTestSuite) Test_AddTracks() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
	}
	params, roomCreatorDeviceID := s.getWorkflowInitParams(initialTracksIDs)
	firstTrackDuration := random.GenerateRandomDuration()
	secondTrackDuration := random.GenerateRandomDuration()
	thirdTrackDuration := random.GenerateRandomDuration()

	var a *activities_mpe.Activities

	initialTracksMetadata := []shared.TrackMetadata{
		{
			ID:         initialTracksIDs[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   firstTrackDuration,
		},
	}
	tracksIDsToAdd := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	tracksToAddMetadata := []shared.TrackMetadata{
		{
			ID:         tracksIDsToAdd[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   secondTrackDuration,
		},
		{
			ID:         tracksIDsToAdd[1],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   thirdTrackDuration,
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
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		tracksIDsToAdd,
		params.RoomCreatorUserID,
		roomCreatorDeviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: tracksToAddMetadata,
		UserID:   params.RoomCreatorUserID,
		DeviceID: roomCreatorDeviceID,
	}, nil).Once()

	s.env.OnActivity(
		a.AcknowledgeAddingTracksActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	initialTracksFetched := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	addTrack := tick * 200
	registerDelayedCallbackWrapper(func() {
		s.emitAddTrackSignal(shared_mpe.NewAddTracksSignalArgs{
			TracksIDs: tracksIDsToAdd,
			UserID:    params.RoomCreatorUserID,
			DeviceID:  roomCreatorDeviceID,
		})
	}, addTrack)

	checkAddingTracks := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		initialTracksMetadataWithTracksToAddMetadata := append(initialTracksMetadata, tracksToAddMetadata...)

		s.Equal(
			initialTracksMetadataWithTracksToAddMetadata,
			mpeState.Tracks,
		)
	}, checkAddingTracks)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *AddTracksTestSuite) Test_AddingTrackAlreadyInPlaylistBeforeFetchingInformationFails() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
	}
	params, roomCreatorDeviceID := s.getWorkflowInitParams(initialTracksIDs)
	firstTrackDuration := random.GenerateRandomDuration()

	var a *activities_mpe.Activities

	initialTracksMetadata := []shared.TrackMetadata{
		{
			ID:         initialTracksIDs[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   firstTrackDuration,
		},
	}
	tracksIDsToAdd := []string{
		initialTracksIDs[0],
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
		a.RejectAddingTracksActivity,
		mock.Anything,
		activities_mpe.RejectAddingTracksActivityArgs{
			RoomID:   params.RoomID,
			UserID:   params.RoomCreatorUserID,
			DeviceID: roomCreatorDeviceID,
		},
	).Return(nil).Once()

	initialTracksFetched := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	addTrack := tick * 200
	registerDelayedCallbackWrapper(func() {
		s.emitAddTrackSignal(shared_mpe.NewAddTracksSignalArgs{
			TracksIDs: tracksIDsToAdd,
			UserID:    params.RoomCreatorUserID,
			DeviceID:  roomCreatorDeviceID,
		})
	}, addTrack)

	checkAddingTracks := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(
			initialTracksMetadata,
			mpeState.Tracks,
		)
	}, checkAddingTracks)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *AddTracksTestSuite) Test_AddingTrackAlreadyInPlaylistAfterFetchingInformationSucceedsIfNotAllTracksAreDuplicated() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
	}
	params, roomCreatorDeviceID := s.getWorkflowInitParams(initialTracksIDs)
	firstTrackDuration := random.GenerateRandomDuration()
	secondTrackDuration := random.GenerateRandomDuration()
	thirdTrackDuration := random.GenerateRandomDuration()
	fourthTrackDuration := random.GenerateRandomDuration()
	totalDuration := fourthTrackDuration.Milliseconds() + thirdTrackDuration.Milliseconds() + secondTrackDuration.Milliseconds() + firstTrackDuration.Milliseconds()

	var a *activities_mpe.Activities

	initialTracksMetadata := []shared.TrackMetadata{
		{
			ID:         initialTracksIDs[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   firstTrackDuration,
		},
	}
	tracksIDsToAddFirstBatch := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	tracksToAddMetadataFirstBatch := []shared.TrackMetadata{
		{
			ID:         tracksIDsToAddFirstBatch[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   secondTrackDuration,
		},
		{
			ID:         tracksIDsToAddFirstBatch[1],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   thirdTrackDuration,
		},
	}
	tracksIDsToAddSecondBatch := []string{
		tracksIDsToAddFirstBatch[0],
		faker.UUIDHyphenated(),
	}
	tracksToAddMetadataSecondBatch := []shared.TrackMetadata{
		tracksToAddMetadataFirstBatch[0],
		{
			ID:         tracksIDsToAddSecondBatch[1],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   fourthTrackDuration,
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
	//
	// Wait for 10 seconds before returning result of the activity.
	const firstBatchTracksInformationFetchingDebouncingDelay = 10 * time.Second
	s.env.OnActivity(
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		tracksIDsToAddFirstBatch,
		params.RoomCreatorUserID,
		roomCreatorDeviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: tracksToAddMetadataFirstBatch,
		UserID:   params.RoomCreatorUserID,
		DeviceID: roomCreatorDeviceID,
	}, nil).Once().After(firstBatchTracksInformationFetchingDebouncingDelay)

	s.env.OnActivity(
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		tracksIDsToAddSecondBatch,
		params.RoomCreatorUserID,
		roomCreatorDeviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: tracksToAddMetadataSecondBatch,
		UserID:   params.RoomCreatorUserID,
		DeviceID: roomCreatorDeviceID,
	}, nil).Once()

	s.env.OnActivity(
		a.AcknowledgeAddingTracksActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Twice()

	initialTracksFetched := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	addTrackFirstBatch := tick * 200
	registerDelayedCallbackWrapper(func() {
		s.emitAddTrackSignal(shared_mpe.NewAddTracksSignalArgs{
			TracksIDs: tracksIDsToAddFirstBatch,
			UserID:    params.RoomCreatorUserID,
			DeviceID:  roomCreatorDeviceID,
		})
	}, addTrackFirstBatch)

	addTrackSecondBatch := tick
	registerDelayedCallbackWrapper(func() {
		s.emitAddTrackSignal(shared_mpe.NewAddTracksSignalArgs{
			TracksIDs: tracksIDsToAddSecondBatch,
			UserID:    params.RoomCreatorUserID,
			DeviceID:  roomCreatorDeviceID,
		})
	}, addTrackSecondBatch)

	checkAddingTracks := firstBatchTracksInformationFetchingDebouncingDelay
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		initialTracksMetadataWithTracksToAddMetadataSecondBatch := append(initialTracksMetadata, tracksToAddMetadataSecondBatch...)
		initialTracksMetadataWithTracksToAddMetadataSecondBatchWithNonDuplicatedTracksMetadataFirstBatch := append(initialTracksMetadataWithTracksToAddMetadataSecondBatch, tracksToAddMetadataFirstBatch[1])

		s.Equal(
			initialTracksMetadataWithTracksToAddMetadataSecondBatchWithNonDuplicatedTracksMetadataFirstBatch,
			mpeState.Tracks,
		)
		s.Equal(totalDuration, mpeState.PlaylistTotalDuration)
	}, checkAddingTracks)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *AddTracksTestSuite) Test_AddingTrackAlreadyInPlaylistAfterFetchingInformationFailsIfAllTracksAreDuplicated() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
	}
	params, roomCreatorDeviceID := s.getWorkflowInitParams(initialTracksIDs)
	firstTrackDuration := random.GenerateRandomDuration()
	secondTrackDuration := random.GenerateRandomDuration()
	thirdTrackDuration := random.GenerateRandomDuration()

	var a *activities_mpe.Activities

	initialTracksMetadata := []shared.TrackMetadata{
		{
			ID:         initialTracksIDs[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   firstTrackDuration,
		},
	}
	tracksIDsToAddFirstBatch := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	tracksToAddMetadataFirstBatch := []shared.TrackMetadata{
		{
			ID:         tracksIDsToAddFirstBatch[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   secondTrackDuration,
		},
		{
			ID:         tracksIDsToAddFirstBatch[1],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   thirdTrackDuration,
		},
	}
	tracksIDsToAddSecondBatch := []string{
		tracksIDsToAddFirstBatch[0],
		tracksIDsToAddFirstBatch[1],
	}
	tracksToAddMetadataSecondBatch := []shared.TrackMetadata{
		tracksToAddMetadataFirstBatch[0],
		tracksToAddMetadataFirstBatch[1],
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
	//
	// Wait for 10 seconds before returning result of the activity.
	const firstBatchTracksInformationFetchingDebouncingDelay = 10 * time.Second
	s.env.OnActivity(
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		tracksIDsToAddFirstBatch,
		params.RoomCreatorUserID,
		roomCreatorDeviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: tracksToAddMetadataFirstBatch,
		UserID:   params.RoomCreatorUserID,
		DeviceID: roomCreatorDeviceID,
	}, nil).Once().After(firstBatchTracksInformationFetchingDebouncingDelay)

	s.env.OnActivity(
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		tracksIDsToAddSecondBatch,
		params.RoomCreatorUserID,
		roomCreatorDeviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: tracksToAddMetadataSecondBatch,
		UserID:   params.RoomCreatorUserID,
		DeviceID: roomCreatorDeviceID,
	}, nil).Once()

	s.env.OnActivity(
		a.AcknowledgeAddingTracksActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	s.env.OnActivity(
		a.RejectAddingTracksActivity,
		mock.Anything,
		activities_mpe.RejectAddingTracksActivityArgs{
			RoomID:   params.RoomID,
			UserID:   params.RoomCreatorUserID,
			DeviceID: roomCreatorDeviceID,
		},
	).Return(nil).Once()

	initialTracksFetched := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	addTrackFirstBatch := tick * 200
	registerDelayedCallbackWrapper(func() {
		s.emitAddTrackSignal(shared_mpe.NewAddTracksSignalArgs{
			TracksIDs: tracksIDsToAddFirstBatch,
			UserID:    params.RoomCreatorUserID,
			DeviceID:  roomCreatorDeviceID,
		})
	}, addTrackFirstBatch)

	addTrackSecondBatch := tick
	registerDelayedCallbackWrapper(func() {
		s.emitAddTrackSignal(shared_mpe.NewAddTracksSignalArgs{
			TracksIDs: tracksIDsToAddSecondBatch,
			UserID:    params.RoomCreatorUserID,
			DeviceID:  roomCreatorDeviceID,
		})
	}, addTrackSecondBatch)

	checkAddingTracks := firstBatchTracksInformationFetchingDebouncingDelay
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		initialTracksMetadataWithTracksToAddMetadataSecondBatch := append(initialTracksMetadata, tracksToAddMetadataSecondBatch...)

		s.Equal(
			initialTracksMetadataWithTracksToAddMetadataSecondBatch,
			mpeState.Tracks,
		)
	}, checkAddingTracks)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *AddTracksTestSuite) Test_IsOpenAndIsOpenOnlyInvitedUsersCanEditAndCreatorIsTrueAddTrack() {
	initialTracksIDs := []string{
		faker.UUIDHyphenated(),
	}
	params, roomCreatorDeviceID := s.getWorkflowInitParams(initialTracksIDs)
	params.IsOpenOnlyInvitedUsersCanEdit = true
	var (
		a                   *activities_mpe.Activities
		invitedUserID       = faker.UUIDHyphenated()
		invitedUserDeviceID = faker.UUIDHyphenated()
		joiningUserID       = faker.UUIDHyphenated()
		joiningUserDeviceID = faker.UUIDHyphenated()
		firstTrackDuration  = random.GenerateRandomDuration()
		secondTrackDuration = random.GenerateRandomDuration()
		thirdTrackDuration  = random.GenerateRandomDuration()
		fourthTrackDuration = random.GenerateRandomDuration()
	)

	initialTracksMetadata := []shared.TrackMetadata{
		{
			ID:         initialTracksIDs[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   firstTrackDuration,
		},
	}

	creatorTrackToAddMetadata := shared.TrackMetadata{
		ID:         faker.UUIDHyphenated(),
		Title:      faker.Word(),
		ArtistName: faker.Name(),
		Duration:   secondTrackDuration,
	}
	invitedUserTrackToAddMetadata := shared.TrackMetadata{
		ID:         faker.UUIDHyphenated(),
		Title:      faker.Word(),
		ArtistName: faker.Name(),
		Duration:   thirdTrackDuration,
	}
	joiningUserTrackToAddMetadata := shared.TrackMetadata{
		ID:         faker.UUIDHyphenated(),
		Title:      faker.Word(),
		ArtistName: faker.Name(),
		Duration:   fourthTrackDuration,
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
	s.env.OnActivity(
		a.AcknowledgeJoinActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Twice()

	initialTracksFetched := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	addInvitedUser := tick
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

	//Creator add track activity
	s.env.OnActivity(
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		[]string{creatorTrackToAddMetadata.ID},
		params.RoomCreatorUserID,
		roomCreatorDeviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: []shared.TrackMetadata{creatorTrackToAddMetadata},
		UserID:   params.RoomCreatorUserID,
		DeviceID: roomCreatorDeviceID,
	}, nil).Once()

	s.env.OnActivity(
		a.AcknowledgeAddingTracksActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	///

	creatorAddsTrack := tick
	registerDelayedCallbackWrapper(func() {
		s.emitAddTrackSignal(shared_mpe.NewAddTracksSignalArgs{
			TracksIDs: []string{creatorTrackToAddMetadata.ID},
			UserID:    params.RoomCreatorUserID,
			DeviceID:  roomCreatorDeviceID,
		})
	}, creatorAddsTrack)

	checkCreatorAddsTracksWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		expectedTracks := append(initialTracksMetadata, creatorTrackToAddMetadata)

		s.Equal(
			expectedTracks,
			mpeState.Tracks,
		)
	}, checkCreatorAddsTracksWorked)

	//InvitedUser adds track activity
	s.env.OnActivity(
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		[]string{invitedUserTrackToAddMetadata.ID},
		invitedUserID,
		invitedUserDeviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: []shared.TrackMetadata{invitedUserTrackToAddMetadata},
		UserID:   invitedUserID,
		DeviceID: invitedUserDeviceID,
	}, nil).Once()

	s.env.OnActivity(
		a.AcknowledgeAddingTracksActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	///

	invitedUserAddsTrack := tick
	registerDelayedCallbackWrapper(func() {
		s.emitAddTrackSignal(shared_mpe.NewAddTracksSignalArgs{
			TracksIDs: []string{invitedUserTrackToAddMetadata.ID},
			UserID:    invitedUserID,
			DeviceID:  invitedUserDeviceID,
		})
	}, invitedUserAddsTrack)

	checkinvitedUserAddsTracksWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		expectedTracks := append(initialTracksMetadata, creatorTrackToAddMetadata, invitedUserTrackToAddMetadata)

		s.Equal(
			expectedTracks,
			mpeState.Tracks,
		)
	}, checkinvitedUserAddsTracksWorked)

	//JoiningUser adds track activity
	s.env.OnActivity(
		activities.FetchTracksInformationActivityAndForwardInitiator,
		mock.Anything,
		[]string{joiningUserTrackToAddMetadata.ID},
		joiningUserID,
		joiningUserDeviceID,
	).Return(activities.FetchedTracksInformationWithInitiator{
		Metadata: []shared.TrackMetadata{joiningUserTrackToAddMetadata},
		UserID:   joiningUserID,
		DeviceID: joiningUserDeviceID,
	}, nil).Never()

	s.env.OnActivity(
		a.AcknowledgeAddingTracksActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()

	s.env.OnActivity(
		a.RejectAddingTracksActivity,
		mock.Anything,
		activities_mpe.RejectAddingTracksActivityArgs{
			RoomID:   params.RoomID,
			UserID:   joiningUserID,
			DeviceID: joiningUserDeviceID,
		},
	).Return(nil).Once()

	///

	JoiningUserAddsTrack := tick
	registerDelayedCallbackWrapper(func() {
		s.emitAddTrackSignal(shared_mpe.NewAddTracksSignalArgs{
			TracksIDs: []string{joiningUserTrackToAddMetadata.ID},
			UserID:    joiningUserID,
			DeviceID:  joiningUserDeviceID,
		})
	}, JoiningUserAddsTrack)

	checkJoiningUserAddsTracksNotWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		expectedTracks := append(initialTracksMetadata, creatorTrackToAddMetadata, invitedUserTrackToAddMetadata)

		s.Equal(
			expectedTracks,
			mpeState.Tracks,
		)
	}, checkJoiningUserAddsTracksNotWorked)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func TestAddTracksTestSuite(t *testing.T) {
	suite.Run(t, new(AddTracksTestSuite))
}
