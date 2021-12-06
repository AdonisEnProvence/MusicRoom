package mtv

import (
	"time"

	shared_mtv "github.com/AdonisEnProvence/MusicRoom/shared/mtv"
	"github.com/Devessier/brainy"
)

func assignInitialFetchedTracks(internalState *MtvRoomInternalState) brainy.Action {
	return func(c brainy.Context, e brainy.Event) error {
		event := e.(MtvRoomInitialTracksFetchedEvent)

		internalState.Tracks.Clear()
		for _, fetchedTrack := range event.Tracks {
			trackWithScore := shared_mtv.TrackMetadataWithScore{
				TrackMetadata: fetchedTrack,

				Score: 0,
			}

			internalState.Tracks.Add(trackWithScore)
			internalState.UserVoteForTrack(internalState.initialParams.RoomCreatorUserID, fetchedTrack.ID)

		}

		if internalState.Tracks.FirstTrackIsReadyToBePlayed(internalState.initialParams.MinimumScoreToBePlayed) {
			setFirstTrackAsCurrentTrack(internalState)
		} else {
			internalState.Timer = shared_mtv.MtvRoomTimer{}
		}

		return nil
	}
}

func setFirstTrackAsCurrentTrack(internalState *MtvRoomInternalState) {
	//By calling this function you assume that next track is ready to be played
	//This should not be called outside a brainy action+cond spec

	firstTrack, _ := internalState.Tracks.Shift()

	internalState.CurrentTrack = shared_mtv.CurrentTrack{
		TrackMetadataWithScore: firstTrack,
		AlreadyElapsed:         0,
	}
	internalState.Timer = shared_mtv.MtvRoomTimer{
		CreatedOn: time.Time{},
		Duration:  internalState.CurrentTrack.Duration,
		Cancel:    nil,
	}

	//As the first track is not anymore in the tracks list, users can now suggest or vote for this song again
	internalState.RemoveTrackFromUserTracksVotedFor(firstTrack.ID)
}

func assignNextTrack(internalState *MtvRoomInternalState) brainy.Action {

	return func(c brainy.Context, e brainy.Event) error {
		setFirstTrackAsCurrentTrack(internalState)

		return nil
	}
}
