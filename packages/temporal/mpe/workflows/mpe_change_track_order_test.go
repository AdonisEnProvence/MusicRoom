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
	params, roomCreatorDeviceID := s.getWorkflowInitParams(faker.UUIDHyphenated())
	initialTracksIDs := []string{
		params.InitialTrackID,
	}
	initialTracksMetadata := []shared.TrackMetadata{
		{
			ID:         initialTracksIDs[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
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
			Duration:   42000,
		},
		{
			ID:         tracksIDsToAdd[1],
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
		activities_mpe.MpeCreationAcknowledgementActivity,
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
		activities_mpe.AcknowledgeAddingTracksActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	s.env.OnActivity(
		activities_mpe.AcknowledgeChangeTrackOrderActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Times(2)
	///

	initialTracksFetched := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	addTrack := tick
	registerDelayedCallbackWrapper(func() {
		s.emitAddTrackSignal(shared_mpe.NewAddTracksSignalArgs{
			TracksIDs: tracksIDsToAdd,
			UserID:    params.RoomCreatorUserID,
			DeviceID:  roomCreatorDeviceID,
		})
	}, addTrack)

	checkAddingTracks := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		initialTracksMetadataWithTracksToAddMetadata := append(initialTracksMetadata, tracksToAddMetadata...)

		s.Equal(
			initialTracksMetadataWithTracksToAddMetadata,
			mpeState.Tracks,
		)
		s.Equal(3, len(mpeState.Tracks))
	}, checkAddingTracks)

	changeTrackOrder := tick
	trackToChangeOrder := initialTracksMetadata[0]
	registerDelayedCallbackWrapper(func() {
		args := shared_mpe.NewChangeTrackOrderSignalArgs{
			DeviceID:         roomCreatorDeviceID,
			FromIndex:        0,
			TrackID:          trackToChangeOrder.ID,
			UserID:           params.RoomCreatorUserID,
			OperationToApply: shared_mpe.MpeOperationToApplyDown,
		}
		s.emitChangeTrackOrder(args)
	}, changeTrackOrder)

	checkChangeTrackOrderWorked := tick
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		expectedIndex := 1
		currentIndex := IndexOfTrackMedata(mpeState.Tracks, trackToChangeOrder)

		s.Equal(expectedIndex, currentIndex)

		expectedPreviousSecondTracksElementIndex := 0
		previousSecondTracksElementIndex := IndexOfTrackMedata(mpeState.Tracks, tracksToAddMetadata[0])

		s.Equal(expectedPreviousSecondTracksElementIndex, previousSecondTracksElementIndex)
	}, checkChangeTrackOrderWorked)

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
		initialTracksMetadataWithTracksToAddMetadata := append(initialTracksMetadata, tracksToAddMetadata...)

		s.Equal(expectedIndex, currentIndex)
		s.Equal(
			initialTracksMetadataWithTracksToAddMetadata,
			mpeState.Tracks,
		)
	}, checkChangeTrackOrderUpWorked)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func TestChangeTrackOrderPlaylistTestSuite(t *testing.T) {
	suite.Run(t, new(ChangeTrackOrderPlaylistTestSuite))
}
