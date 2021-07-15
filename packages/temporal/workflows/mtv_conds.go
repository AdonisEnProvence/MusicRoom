package workflows

import "github.com/Devessier/brainy"

func hasNextTrackToPlay(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		hasNextTrackToPlay := len(internalState.Tracks) > 0

		return hasNextTrackToPlay
	}
}
