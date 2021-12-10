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
			fmt.Println("userCanPerformChangeTrackPlaylistEditionOperation user not found")
			return false
		}

		roomIsOpenAndOnlyInvitedUsersCanEdit := internalState.getRoomIsOpenAndOnlyInvitedUsersCanEdit()
		if roomIsOpenAndOnlyInvitedUsersCanEdit {

			userHasNotBeenInvited := !user.UserHasBeenInvited
			if userHasNotBeenInvited {
				fmt.Println("userCanPerformChangeTrackPlaylistEditionOperation user has not been invited")
				return false
			}
		}

		trackCurrentIndexFromTracksSet := internalState.Tracks.IndexOf(event.TrackID)
		if trackCurrentIndexFromTracksSet == -1 {
			fmt.Println("userCanPerformChangeTrackPlaylistEditionOperation track not found")
			return false
		}

		givenTrackIndexIsOutdated := trackCurrentIndexFromTracksSet != event.FromIndex
		if givenTrackIndexIsOutdated {
			fmt.Println("userCanPerformChangeTrackPlaylistEditionOperation given fromIndex is outdated")
			return false
		}

		switch event.OperationToApply {
		case shared_mpe.MpeOperationToApplyUp:

			if indexDoesNotFitTracksRange := !internalState.Tracks.GivenIndexFitTracksRange(event.FromIndex - 1); indexDoesNotFitTracksRange {
				fmt.Println("userCanPerformChangeTrackPlaylistEditionOperation Index doesNotFitTracksRange")
				return false
			}
		case shared_mpe.MpeOperationToApplyDown:

			if indexDoesNotFitTracksRange := !internalState.Tracks.GivenIndexFitTracksRange(event.FromIndex + 1); indexDoesNotFitTracksRange {
				fmt.Println("userCanPerformChangeTrackPlaylistEditionOperation Index doesNotFitTracksRange")
				return false
			}
		default:
			fmt.Println("userCanPerformChangeTrackPlaylistEditionOperation event.OperationToApply unkown value")
			return false
		}

		return true
	}
}
