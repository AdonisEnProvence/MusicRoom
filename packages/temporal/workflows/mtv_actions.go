package workflows

import (
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/Devessier/brainy"
)

func assignFetchedTracks(internalState *MtvRoomInternalState) brainy.Action {
	return func(c brainy.Context, e brainy.Event) error {
		event := e.(MtvRoomInitialTracksFetchedEvent)
		internalState.Tracks = event.Tracks

		if tracksCount := len(event.Tracks); tracksCount > 0 {
			currentTrack := internalState.Tracks[0]
			internalState.CurrentTrack = currentTrack

			if tracksCount == 1 {
				internalState.Tracks = []shared.TrackMetadata{}
				internalState.TracksIDsList = []string{}
			} else {
				internalState.Tracks = internalState.Tracks[1:]
				internalState.TracksIDsList = internalState.TracksIDsList[1:]
			}
		}

		return nil
	}
}

func assignNextTrackIfAvailable(internalState *MtvRoomInternalState) brainy.Action {
	return func(c brainy.Context, e brainy.Event) error {
		ctx := c.(*MtvRoomMachineContext)

		tracksCount := len(internalState.Tracks)
		internalState.CurrentTrack = internalState.Tracks[0]
		ctx.Timer = shared.MtvRoomTimer{
			State:         shared.MtvRoomTimerStateIdle,
			Elapsed:       0,
			TotalDuration: internalState.CurrentTrack.Duration,
		}

		if tracksCount == 1 {
			internalState.Tracks = []shared.TrackMetadata{}
			internalState.TracksIDsList = []string{}
		} else {
			internalState.Tracks = internalState.Tracks[1:]
			internalState.TracksIDsList = internalState.TracksIDsList[1:]
		}

		return nil
	}
}
