package workflows

import (
	"github.com/AdonisEnProvence/MusicRoom/shared"
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
		playingModeIsDirect := internalState.initialParams.PlayingMode == shared.MtvPlayingModeDirect

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
