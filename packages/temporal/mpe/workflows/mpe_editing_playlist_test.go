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

type EditingPlaylistTestSuite struct {
	UnitTestSuite
}

func (s *EditingPlaylistTestSuite) Test_AddTracks() {
	params, _ := s.getWorkflowInitParams(faker.UUIDHyphenated())
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
	tracksToAdd := []string{
		faker.UUIDHyphenated(),
		faker.UUIDHyphenated(),
	}
	tracksToAddMetadata := []shared.TrackMetadata{
		{
			ID:         tracksToAdd[0],
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   42000,
		},
		{
			ID:         tracksToAdd[1],
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
		activities_mpe.CreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()
	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(initialTracksMetadata, nil).Once()

	// Specific activities calls
	// s.env.OnActivity(
	// 	activities.FetchTracksInformationActivity,
	// 	mock.Anything,
	// 	tracksToAdd,
	// ).Return(tracksToAddMetadata, nil).Once()

	initialTracksFetched := tick * 200
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(initialTracksMetadata, mpeState.Tracks)
	}, initialTracksFetched)

	addTrack := tick * 200
	registerDelayedCallbackWrapper(func() {
		s.emitAddTrackSignal(shared_mpe.NewAddTracksSignalArgs{
			TracksIDs: tracksToAdd,
		})
	}, addTrack)

	checkAddingTracks := tick * 200 * 100
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Subset(mpeState.Tracks, initialTracksMetadata, "Contains initial tracks")
		s.Subset(mpeState.Tracks, tracksToAddMetadata, "Contains added tracks")
	}, checkAddingTracks)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func TestEditingPlaylistTestSuite(t *testing.T) {
	suite.Run(t, new(EditingPlaylistTestSuite))
}
