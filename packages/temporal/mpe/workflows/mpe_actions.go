package mpe

import (
	"fmt"

	activities_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/activities"
	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	"github.com/Devessier/brainy"
	"go.temporal.io/sdk/workflow"
)

func assignInitialFetchedTracks(internalState *MpeRoomInternalState) brainy.Action {
	return func(c brainy.Context, e brainy.Event) error {
		event := e.(MpeRoomInitialTrackFetchedEvent)

		internalState.Tracks.Clear()
		for _, fetchedTrack := range event.Tracks {
			internalState.Tracks.Add(fetchedTrack)
		}

		return nil
	}
}

//This actions should be called only after calling userCanPerformChangeTrackPlaylistEditionOperation
func changeTrackOrder(ctx workflow.Context, internalState *MpeRoomInternalState) brainy.Action {
	return func(c brainy.Context, e brainy.Event) error {
		event := e.(MpeRoomChangeTrackOrderEvent)

		switch event.OperationToApply {
		case shared_mpe.MpeOperationToApplyUp:

			fmt.Println("UP")
			if err := internalState.Tracks.Swap(event.FromIndex, event.FromIndex-1); err != nil {

				sendRejectChangeTrackOrderActivity(ctx, activities_mpe.RejectChangeTrackOrderActivityArgs{
					DeviceID: event.DeviceID,
					UserID:   event.UserID,
					RoomID:   internalState.initialParams.RoomID,
				})
				fmt.Println("UP FAILED", err)
				return nil
			}
		case shared_mpe.MpeOperationToApplyDown:

			fmt.Println("DOWN")
			if err := internalState.Tracks.Swap(event.FromIndex, event.FromIndex+1); err != nil {

				sendRejectChangeTrackOrderActivity(ctx, activities_mpe.RejectChangeTrackOrderActivityArgs{
					DeviceID: event.DeviceID,
					UserID:   event.UserID,
					RoomID:   internalState.initialParams.RoomID,
				})
				fmt.Println("DOWN FAILED", err)
				return nil
			}
		default:
			fmt.Println("switch OperationToApply unkown value")
			//We do not send back a reject activity here because we consider
			//that if a user sends an invalid OperationToApplyValue it means that
			//he wrote the raw req
			return nil
		}

		sendAcknowledgeChangeTrackOrderActivity(ctx, activities_mpe.AcknowledgeChangeTrackOrderActivityArgs{
			DeviceID: event.DeviceID,
			UserID:   event.UserID,
			State:    internalState.Export(shared_mpe.NoRelatedUserID),
		})

		return nil
	}
}
