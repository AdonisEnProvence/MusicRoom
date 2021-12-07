package mpe

import (
	"github.com/Devessier/brainy"
)

func assignInitialFetchedTrack(internalState *MpeRoomInternalState) brainy.Action {
	return func(c brainy.Context, e brainy.Event) error {
		event := e.(MpeRoomInitialTrackFetchedEvent)

		internalState.Tracks.Clear()
		internalState.Tracks.Add(event.Track)

		return nil
	}
}
