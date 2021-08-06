package workflows

import (
	"time"

	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/Devessier/brainy"
)

func assignFetchedTracks(internalState *MtvRoomInternalState) brainy.Action {
	return func(c brainy.Context, e brainy.Event) error {
		event := e.(MtvRoomInitialTracksFetchedEvent)

		internalState.Tracks = event.Tracks

		if tracksCount := len(event.Tracks); tracksCount > 0 {
			currentTrack := internalState.Tracks[0]
			internalState.CurrentTrack = shared.CurrentTrack{
				TrackMetadata:  currentTrack,
				StartedOn:      time.Time{},
				AlreadyElapsed: 0,
			}
			internalState.Timer = shared.MtvRoomTimer{
				CreatedOn: time.Time{},
				Duration:  currentTrack.Duration,
				Cancel:    nil,
			}

			if tracksCount == 1 {
				internalState.Tracks = []shared.TrackMetadata{}
				internalState.TracksIDsList = []string{}
			} else {
				internalState.Tracks = internalState.Tracks[1:]
				internalState.TracksIDsList = internalState.TracksIDsList[1:]
			}
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

		internalState.CurrentTrack = shared.CurrentTrack{
			TrackMetadata:  internalState.Tracks[0],
			StartedOn:      time.Time{},
			AlreadyElapsed: 0,
		}
		internalState.Timer = shared.MtvRoomTimer{
			CreatedOn: time.Time{},
			Duration:  internalState.CurrentTrack.Duration,
			Cancel:    nil,
		}

		internalState.Tracks = internalState.Tracks[1:]
		internalState.TracksIDsList = internalState.TracksIDsList[1:]

		return nil
	}
}
