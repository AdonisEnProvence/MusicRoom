package mpe

import (
	"github.com/Devessier/brainy"
)

func assignInitialFetchedTracks(internalState *MpeRoomInternalState) brainy.Action {
	return func(c brainy.Context, e brainy.Event) error {
		event := e.(MpeRoomInitialTrackFetchedEvent)

		internalState.Tracks.Clear()
		for _, fetchedTrack := range event.Tracks {
			internalState.Tracks.Add(fetchedTrack)
		}

		return nil
	}
}
