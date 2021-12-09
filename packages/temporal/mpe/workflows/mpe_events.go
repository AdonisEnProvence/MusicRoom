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

type MpeRoomAddTracksEvent struct {
	brainy.EventWithType

	TracksIDs []string
	UserID    string
	DeviceID  string
}

type NewMpeRoomAddTracksEventArgs struct {
	TracksIDs []string
	UserID    string
	DeviceID  string
}

func NewMpeRoomAddTracksEvent(args NewMpeRoomAddTracksEventArgs) MpeRoomAddTracksEvent {
	return MpeRoomAddTracksEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeRoomAddTracksEventType,
		},

		TracksIDs: args.TracksIDs,
		UserID:    args.UserID,
		DeviceID:  args.DeviceID,
	}
}

type MpeRoomAddedTracksInformationFetchedEvent struct {
	brainy.EventWithType

	AddedTracksInformation []shared.TrackMetadata
	UserID                 string
	DeviceID               string
}

type NewMpeRoomAddedTracksInformationFetchedEventArgs struct {
	AddedTracksInformation []shared.TrackMetadata
	UserID                 string
	DeviceID               string
}

func NewMpeRoomAddedTracksInformationFetchedEvent(args NewMpeRoomAddedTracksInformationFetchedEventArgs) MpeRoomAddedTracksInformationFetchedEvent {
	return MpeRoomAddedTracksInformationFetchedEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeRoomAddedTracksInformationFetchedEventType,
		},

		AddedTracksInformation: args.AddedTracksInformation,
		UserID:                 args.UserID,
		DeviceID:               args.DeviceID,
	}
}
