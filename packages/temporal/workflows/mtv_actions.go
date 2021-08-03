package workflows

import (
	"fmt"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/Devessier/brainy"
)

func assignFetchedTracks(internalState *MtvRoomInternalState) brainy.Action {
	return func(c brainy.Context, e brainy.Event) error {
		ctx := c.(*MtvRoomMachineContext)
		event := e.(MtvRoomInitialTracksFetchedEvent)

		internalState.Tracks = event.Tracks

		if tracksCount := len(event.Tracks); tracksCount > 0 {
			currentTrack := internalState.Tracks[0]
			internalState.CurrentTrack = shared.CurrentTrack{
				TrackMetadata:  currentTrack,
				StartedOn:      time.Time{},
				AlreadyElapsed: 0,
			}
			ctx.Timer = shared.MtvRoomTimer{
				State:         shared.MtvRoomTimerStateIdle,
				CreatedOn:     time.Time{},
				TotalDuration: currentTrack.Duration,
			}

			if tracksCount == 1 {
				internalState.Tracks = []shared.TrackMetadata{}
				internalState.TracksIDsList = []string{}
			} else {
				internalState.Tracks = internalState.Tracks[1:]
				internalState.TracksIDsList = internalState.TracksIDsList[1:]
			}
		} else {
			ctx.Timer = shared.MtvRoomTimer{
				State:         shared.MtvRoomTimerStateIdle,
				CreatedOn:     time.Time{},
				TotalDuration: 0,
			}
		}

		return nil
	}
}

func assignNextTracK(internalState *MtvRoomInternalState) brainy.Action {

	return func(c brainy.Context, e brainy.Event) error {
		machineContext := c.(*MtvRoomMachineContext)
		fmt.Printf("****************\n")
		fmt.Printf("%+v\n", internalState.Tracks)
		fmt.Printf("%+v\n", internalState.TracksIDsList)
		fmt.Printf("----------------\n")
		internalState.CurrentTrack = shared.CurrentTrack{
			TrackMetadata:  internalState.Tracks[0],
			StartedOn:      time.Time{},
			AlreadyElapsed: 0,
		}
		machineContext.Timer = shared.MtvRoomTimer{
			State:         shared.MtvRoomTimerStateIdle,
			CreatedOn:     time.Time{},
			TotalDuration: internalState.CurrentTrack.Duration,
		}

		internalState.Tracks = internalState.Tracks[1:]
		internalState.TracksIDsList = internalState.TracksIDsList[1:]

		fmt.Printf("%+v\n", internalState.Tracks)
		fmt.Printf("%+v\n", internalState.TracksIDsList)
		fmt.Printf("****************\n")
		return nil
	}
}
