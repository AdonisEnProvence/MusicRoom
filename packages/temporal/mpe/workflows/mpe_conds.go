package mpe

import (
	"github.com/Devessier/brainy"
)

func userCanPerformChangeTrackPlaylistEditionOperation(internalState *MpeRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		event := e.(MpeRoomChangeTrackOrderEvent)

		user := internalState.GetUserRelatedInformation(event.UserID)
		if user == nil {
			return false
		}

		roomIsOpenAndOnlyInvitedUsersCanEdit := internalState.getRoomIsOpenAndOnlyInvitedUsersCanEdit()
		if roomIsOpenAndOnlyInvitedUsersCanEdit {
			userHasNotBeenInvited := !user.UserHasBeenInvited
			if userHasNotBeenInvited {
				return false
			}
		}

		return true
	}
}
