package mpe

import (
	"fmt"

	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	"github.com/Devessier/brainy"
)

func userExistsAndUserCanEditTheTracksList(internalState *MpeRoomInternalState, UserID string) bool {
	user := internalState.GetUserRelatedInformation(UserID)
	fmt.Println("CECI EST LE USER", user)
	if user == nil {
		fmt.Println("userCanPerformEditionOperationOnTheTracksList user not found")
		return false
	}

	roomIsOpenAndOnlyInvitedUsersCanEdit := internalState.getRoomIsOpenAndOnlyInvitedUsersCanEdit()
	if roomIsOpenAndOnlyInvitedUsersCanEdit {

		userHasNotBeenInvited := !user.UserHasBeenInvited
		userIsNotTheRoomCreator := internalState.initialParams.RoomCreatorUserID != UserID
		if userHasNotBeenInvited && userIsNotTheRoomCreator {
			fmt.Println("userCanPerformEditionOperationOnTheTracksList user has not been invited and only invited users can edit is true")
			return false
		}
	}

	return true
}

//The event listener will send back a reject activity if this condition is false
func userCanPerformChangeTrackPlaylistEditionOperation(internalState *MpeRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		event := e.(MpeRoomChangeTrackOrderEvent)

		//Note that even if the user doesnot exist we will still send back a reject activity
		userDoesnotExistsOrUserCannotEditTheTracksList := !userExistsAndUserCanEditTheTracksList(internalState, event.UserID)
		if userDoesnotExistsOrUserCannotEditTheTracksList {
			fmt.Println("userCanPerformChangeTrackPlaylistEditionOperation user doesnot exist or cannot edit the playlist")
			return false
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

func userCanPerformDeleteTracksOperation(internalState *MpeRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		event := e.(MpeRoomDeleteTracksEvent)

		userDoesnotExistsOrUserCannotEditTheTracksList := !userExistsAndUserCanEditTheTracksList(internalState, event.UserID)
		if userDoesnotExistsOrUserCannotEditTheTracksList {
			fmt.Println("userCanPerformDeleteTracksOperation user doesnot exist or cannot edit the playlist")
			return false
		}

		return true
	}
}

func userIsNotAlreadyInRoom(internalState *MpeRoomInternalState) brainy.Cond {
	return func(c brainy.Context, e brainy.Event) bool {
		event := e.(MpeRoomAddUserEvent)

		if user := internalState.GetUserRelatedInformation(event.UserID); user != nil {
			fmt.Println("userCanPerformDeleteTracksOperation user doesnot exist or cannot edit the playlist")
			return false
		}

		return true
	}
}
