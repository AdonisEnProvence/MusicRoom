package workflows

import (
	"fmt"

	"github.com/Devessier/brainy"
)

func hasNextTrackToPlay(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		hasNextTrackToPlay := internalState.Tracks.FirstTrackIsReadyToBePlayed(internalState.MinimumScoreToBePlayed)

		return hasNextTrackToPlay
	}
}

func canPlayCurrentTrack(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		hasReachedEndOfCurrentTrack := internalState.CurrentTrack.AlreadyElapsed == internalState.CurrentTrack.Duration
		hasNextTrackToPlay := internalState.Tracks.FirstTrackIsReadyToBePlayed(internalState.MinimumScoreToBePlayed)
		hasNoNextTrackToPlay := !hasNextTrackToPlay
		canNotPlayCurrentTrack := hasReachedEndOfCurrentTrack && hasNoNextTrackToPlay
		canPlayCurrentTrack := !canNotPlayCurrentTrack

		return canPlayCurrentTrack
	}
}

func currentTrackEndedAndNextTrackIsReadyToBePlayed(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		nextTrackIsReadyToBePlayed := internalState.Tracks.FirstTrackIsReadyToBePlayed(internalState.MinimumScoreToBePlayed)
		//See if we need a delta
		//Remark: in case of all initials tracks fetching fails, we expect the room to autoplay
		//the very next ready to be played track in the queue, in this way here we do not verify
		//if the current is at it's default values aka internalState.CurrentTrack.Duration === 0
		currentTrackEnded := internalState.CurrentTrack.Duration == internalState.CurrentTrack.AlreadyElapsed

		return currentTrackEnded && nextTrackIsReadyToBePlayed
	}
}

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
