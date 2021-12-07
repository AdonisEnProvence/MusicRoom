package mtv

import (
	shared_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/shared"
	"github.com/Devessier/brainy"
)

func userHasPermissionAndHasNextTrackToPlay(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		event := e.(MtvRoomGoToNextTrackEvent)

		userDoesNotHaveControlAndDelegationPermission := !internalState.UserHasControlAndDelegationPermission(event.UserID)
		if userDoesNotHaveControlAndDelegationPermission {
			return false
		}
		hasNextTrackToPlay := internalState.Tracks.FirstTrackIsReadyToBePlayed(internalState.initialParams.MinimumScoreToBePlayed)

		return hasNextTrackToPlay
	}
}

func checkUserPermissionAndCanPlayCurrentTrack(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		event := e.(MtvRoomPlayEvent)

		userDoesNotHaveControlAndDelegationPermission := !internalState.UserHasControlAndDelegationPermission(event.UserID)
		if userDoesNotHaveControlAndDelegationPermission {
			return false
		}

		hasReachedEndOfCurrentTrack := internalState.CurrentTrack.AlreadyElapsed == internalState.CurrentTrack.Duration
		hasNextTrackToPlay := internalState.Tracks.FirstTrackIsReadyToBePlayed(internalState.initialParams.MinimumScoreToBePlayed)
		hasNoNextTrackToPlay := !hasNextTrackToPlay
		canNotPlayCurrentTrack := hasReachedEndOfCurrentTrack && hasNoNextTrackToPlay
		canPlayCurrentTrack := !canNotPlayCurrentTrack

		return canPlayCurrentTrack
	}
}

func userHasPermissionToPauseCurrentTrack(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		event := e.(MtvRoomPauseEvent)

		return internalState.UserHasControlAndDelegationPermission(event.UserID)
	}
}

func currentTrackEndedAndNextTrackIsReadyToBePlayed(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		//We might need a delta ? between elapsed and maxDuration
		nextTrackIsReadyToBePlayed := internalState.Tracks.FirstTrackIsReadyToBePlayed(internalState.initialParams.MinimumScoreToBePlayed)
		//Remark:
		//If of all initials tracks fetching fails or not initial tracks are eligible to be
		//load as currentTrack during room creation, we expect the room to autoplay
		//the very next ready to be played track in the queue.
		//In this way here we do not verify if the current track is at it's default value
		currentTrackEnded := internalState.CurrentTrack.Duration == internalState.CurrentTrack.AlreadyElapsed

		return currentTrackEnded && nextTrackIsReadyToBePlayed
	}
}

func roomHasPositionAndTimeConstraint(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		return internalState.initialParams.HasPhysicalAndTimeConstraints && internalState.initialParams.PhysicalAndTimeConstraints != nil
	}
}

func roomPlayingModeIsDirectAndUserExistsAndEmitterHasPermissions(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		event := e.(MtvRoomUpdateDelegationOwnerEvent)

		if internalState.GetUserRelatedInformation(event.NewDelegationOwnerUserID) == nil {
			return false
		}

		emitterUser := internalState.GetUserRelatedInformation(event.EmitterUserID)
		if emitterUser == nil {
			return false
		}

		emitterUserHasPermission := emitterUser.HasControlAndDelegationPermission
		playingModeIsDirect := internalState.initialParams.PlayingMode == shared_mtv.MtvPlayingModeDirect

		return playingModeIsDirect && emitterUserHasPermission
	}
}

func userToUpdateExists(internalState *MtvRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		event := e.(MtvRoomUpdateControlAndDelegationPermissionEvent)

		doesUserToUpdateExist := internalState.HasUser(event.ToUpdateUserID)

		return doesUserToUpdateExist
	}
}
