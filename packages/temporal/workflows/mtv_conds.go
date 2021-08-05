package workflows

import (
	"fmt"

	"github.com/Devessier/brainy"
)

func hasNextTrackToPlay(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		hasNextTrackToPlay := len(internalState.Tracks) > 0

		return hasNextTrackToPlay
	}
}

func canPlayCurrentTrack(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		hasNextTrackToPlay := len(internalState.Tracks) > 0
		hasNoNextTrackToPlay := !hasNextTrackToPlay

		hasReachedEndOfCurrentTrack := internalState.CurrentTrack.AlreadyElapsed == internalState.CurrentTrack.Duration

		canNotPlayCurrentTrack := hasReachedEndOfCurrentTrack && hasNoNextTrackToPlay
		canPlayCurrentTrack := !canNotPlayCurrentTrack
		fmt.Println("-------------COND FOR PLAY IS ", canPlayCurrentTrack)
		return canPlayCurrentTrack
	}
}
