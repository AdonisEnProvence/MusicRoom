package workflows

import (
	"fmt"

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
			fmt.Println("vote aborted: couldnt find given userID in the users list")
			return false
		}

		couldFindTrackInTracksList := internalState.Tracks.Has(trackID)
		if !couldFindTrackInTracksList {
			fmt.Println("vote aborted: couldnt find given trackID in the tracks list")
			return false
		}

		userAlreadyVotedForTrack := user.HasVotedFor(trackID)
		if userAlreadyVotedForTrack {
			fmt.Println("vote aborted: given userID has already voted for given trackID")
			return false
		}

		return true
	}
}
