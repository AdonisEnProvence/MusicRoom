package mpe

import (
	"fmt"

	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	"github.com/Devessier/brainy"
)

//The event listener will send back a reject activity if this condition is false
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

		trackCurrentIndexFromTracksSet, err := internalState.Tracks.IndexOf(event.TrackID)
		if err || trackCurrentIndexFromTracksSet == -1 {
			return false
		}

		givenTrackIndexIsOutdated := trackCurrentIndexFromTracksSet != event.FromIndex
		if givenTrackIndexIsOutdated {
			return false
		}

		switch event.OperationToApply {
		case shared_mpe.MpeOperationToApplyUp:

			fmt.Println("CHECK UP")
			if indexDoesNotFitTracksRange := !internalState.Tracks.GivenIndexFitTracksRange(event.FromIndex - 1); indexDoesNotFitTracksRange {
				fmt.Println("CHECK UP FAILED")
				return false
			}
		case shared_mpe.MpeOperationToApplyDown:

			fmt.Println("CHECK DOWN")
			if indexDoesNotFitTracksRange := !internalState.Tracks.GivenIndexFitTracksRange(event.FromIndex + 1); indexDoesNotFitTracksRange {
				fmt.Println("CHECK DOWN FAILED")
				return false
			}
		}

		return true
	}
}
