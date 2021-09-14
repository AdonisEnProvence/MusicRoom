package workflows

import (
	"github.com/Devessier/brainy"
)

func hasNextTrackToPlay(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		hasNextTrackToPlay := internalState.Tracks.FirstTrackIsReadyToBePlayed(internalState.initialParams.MinimumScoreToBePlayed)

		return hasNextTrackToPlay
	}
}

func canPlayCurrentTrack(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		hasReachedEndOfCurrentTrack := internalState.CurrentTrack.AlreadyElapsed == internalState.CurrentTrack.Duration
		hasNextTrackToPlay := internalState.Tracks.FirstTrackIsReadyToBePlayed(internalState.initialParams.MinimumScoreToBePlayed)
		hasNoNextTrackToPlay := !hasNextTrackToPlay
		canNotPlayCurrentTrack := hasReachedEndOfCurrentTrack && hasNoNextTrackToPlay
		canPlayCurrentTrack := !canNotPlayCurrentTrack

		return canPlayCurrentTrack
	}
}

func currentTrackEndedAndNextTrackIsReadyToBePlayed(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		nextTrackIsReadyToBePlayed := internalState.Tracks.FirstTrackIsReadyToBePlayed(internalState.initialParams.MinimumScoreToBePlayed)
		//See if we need a delta
		//Remark: in case of all initials tracks fetching fails, we expect the room to autoplay
		//the very next ready to be played track in the queue, in this way here we do not verify
		//if the current is at it's default values aka internalState.CurrentTrack.Duration === 0
		currentTrackEnded := internalState.CurrentTrack.Duration == internalState.CurrentTrack.AlreadyElapsed

		return currentTrackEnded && nextTrackIsReadyToBePlayed
	}
}

func roomHasPositionAndTimeConstraint(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		return internalState.initialParams.HasPhysicalAndTimeConstraints && internalState.initialParams.PhysicalAndTimeConstraints != nil
	}
}
