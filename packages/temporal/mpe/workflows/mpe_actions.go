package mpe

import (
	"fmt"

	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
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

func attempTochangeTrackOrder(internalState *MpeRoomInternalState) brainy.Action {
	return func(c brainy.Context, e brainy.Event) error {
		event := e.(MpeRoomChangeTrackOrderEvent)

		trackCurrentIndexFromTracksSet, err := internalState.Tracks.IndexOf(event.TrackID)

		if err || trackCurrentIndexFromTracksSet == -1 {
			//TODO SEND BACK CHANGE TRACK ORDER HAS BEEN REJECTED ACTIVITY
			return nil
		}

		givenTrackIndexIsOutdated := trackCurrentIndexFromTracksSet != event.FromIndex
		if givenTrackIndexIsOutdated {
			//TODO SEND BACK CHANGE TRACK ORDER HAS BEEN REJECTED ACTIVITY
			return nil
		}

		switch event.OperationToApply {
		case shared_mpe.MpeOperationToApplyUp:
			fmt.Println("UP")
			if err := internalState.Tracks.Swap(event.FromIndex, event.FromIndex-1); err != nil {
				//TODO SEND BACK CHANGE TRACK ORDER HAS BEEN REJECTED ACTIVITY
				fmt.Println("UP FAILED", err)
			}
			//TODO SEND SUCCES
		case shared_mpe.MpeOperationToApplyDown:
			fmt.Println("DOWN")
			if err := internalState.Tracks.Swap(event.FromIndex, event.FromIndex+1); err != nil {
				//TODO SEND BACK CHANGE TRACK ORDER HAS BEEN REJECTED ACTIVITY
				fmt.Println("DOWN FAILED", err)
			}
			//TODO SEND SUCCES
		default:
			fmt.Println("switch OperationToApply unkown value")
		}

		return nil
	}
}
