package mpe

import (
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/Devessier/brainy"
)

type MpeRoomInitialTrackFetchedEvent struct {
	brainy.EventWithType

	Track shared.TrackMetadata
}

func NewMpeRoomInitialTracksFetchedEvent(track shared.TrackMetadata) MpeRoomInitialTrackFetchedEvent {
	return MpeRoomInitialTrackFetchedEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeRoomInitialTracksFetched,
		},
		Track: track,
	}
}
