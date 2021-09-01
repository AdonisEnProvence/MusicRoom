package workflows

import (
	"github.com/Devessier/brainy"
)

func hasNextTrackToPlay(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		hasNextTrackToPlay := internalState.Tracks.Len() > 0

		return hasNextTrackToPlay
	}
}

func canPlayCurrentTrack(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		hasReachedEndOfCurrentTrack := internalState.CurrentTrack.AlreadyElapsed == internalState.CurrentTrack.Duration
		hasNextTrackToPlay := internalState.Tracks.Len() > 0
		hasNoNextTrackToPlay := !hasNextTrackToPlay
		canNotPlayCurrentTrack := hasReachedEndOfCurrentTrack && hasNoNextTrackToPlay
		canPlayCurrentTrack := !canNotPlayCurrentTrack

		return canPlayCurrentTrack
	}
}

/*
	user, exists := internalState.Users[userID]

	if !exists {
		return false
	}
*/

func userCanVoteForTrackID(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		voteForTrackEvent := e.(MtvRoomUserVoteForTrackEvent)
		userID := voteForTrackEvent.UserID
		trackID := voteForTrackEvent.TrackID

		user, exists := internalState.Users[userID]
		if !exists {
			return false
		}

		couldFindTrackInTracksList := internalState.Tracks.Has(trackID)
		if !couldFindTrackInTracksList {
			return false
		}

		for _, votedForTrackID := range user.TracksVotedFor {
			if votedForTrackID == trackID {
				return true
			}
		}
		return false
	}
}
