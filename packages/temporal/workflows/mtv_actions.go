package workflows

import (
	"time"

	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/Devessier/brainy"
)

func assignInitialFetchedTracks(internalState *MtvRoomInternalState) brainy.Action {
	return func(c brainy.Context, e brainy.Event) error {
		event := e.(MtvRoomInitialTracksFetchedEvent)

		internalState.Tracks.Clear()
		for _, fetchedTrack := range event.Tracks {
			trackWithScore := shared.TrackMetadataWithScore{
				TrackMetadata: fetchedTrack,

				Score: 0,
			}

			internalState.Tracks.Add(trackWithScore)
			internalState.UserVotedForTrack(internalState.initialParams.RoomCreatorUserID, fetchedTrack.ID)

		}

		if tracksCount := len(event.Tracks); tracksCount > 0 {
			currentTrack, _ := internalState.Tracks.Shift()

			internalState.CurrentTrack = shared.CurrentTrack{
				TrackMetadataWithScore: currentTrack,
				AlreadyElapsed:         0,
			}
			internalState.Timer = shared.MtvRoomTimer{
				CreatedOn: time.Time{},
				Duration:  currentTrack.Duration,
				Cancel:    nil,
			}
			internalState.RemoveTrackFromUserTracksVotedFor(currentTrack.ID)

		} else {
			internalState.Timer = shared.MtvRoomTimer{
				CreatedOn: time.Time{},
				Duration:  0,
				Cancel:    nil,
			}
		}

		return nil
	}
}

func assignNextTrack(internalState *MtvRoomInternalState) brainy.Action {

	return func(c brainy.Context, e brainy.Event) error {
		firstTrack, _ := internalState.Tracks.Shift()

		internalState.CurrentTrack = shared.CurrentTrack{
			TrackMetadataWithScore: firstTrack,
			AlreadyElapsed:         0,
		}
		internalState.Timer = shared.MtvRoomTimer{
			CreatedOn: time.Time{},
			Duration:  internalState.CurrentTrack.Duration,
			Cancel:    nil,
		}

		//As the first track is not anymore in the tracks list, users can now suggest or vote for this song again
		internalState.RemoveTrackFromUserTracksVotedFor(firstTrack.ID)

		return nil
	}
}
