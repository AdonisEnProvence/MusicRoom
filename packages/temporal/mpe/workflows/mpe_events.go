package mpe

import (
	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	shared_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/shared"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/Devessier/brainy"
)

type MpeRoomInitialTrackFetchedEvent struct {
	brainy.EventWithType

	Tracks []shared.TrackMetadata
}

func NewMpeRoomInitialTracksFetchedEvent(tracks []shared.TrackMetadata) MpeRoomInitialTrackFetchedEvent {
	return MpeRoomInitialTrackFetchedEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeRoomInitialTracksFetched,
		},
		Tracks: tracks,
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

type MpeRoomChangeTrackOrderEvent struct {
	brainy.EventWithType

	TrackID          string
	UserID           string
	DeviceID         string
	OperationToApply shared_mpe.MpeOperationToApplyValue
	FromIndex        int
}

type NewMpeRoomChangeTrackOrderEventArgs struct {
	TrackID          string
	UserID           string
	DeviceID         string
	OperationToApply shared_mpe.MpeOperationToApplyValue
	FromIndex        int
}

func NewMpeRoomChangeTrackOrderEvent(args NewMpeRoomChangeTrackOrderEventArgs) MpeRoomChangeTrackOrderEvent {
	return MpeRoomChangeTrackOrderEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeRoomChangeTrackOrderEventType,
		},

		TrackID:          args.TrackID,
		UserID:           args.UserID,
		DeviceID:         args.DeviceID,
		OperationToApply: args.OperationToApply,
		FromIndex:        args.FromIndex,
	}
}

type MpeRoomDeleteTracksEvent struct {
	brainy.EventWithType

	TracksIDs []string `validate:"required,dive,required"`
	UserID    string   `validate:"required,uuid"`
	DeviceID  string   `validate:"required,uuid"`
}

type NewMpeRoomDeleteTracksEventArgs struct {
	TracksIDs []string
	UserID    string
	DeviceID  string
}

func NewMpeRoomDeleteTracksEvent(args NewMpeRoomDeleteTracksEventArgs) MpeRoomDeleteTracksEvent {
	return MpeRoomDeleteTracksEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeRoomDeleteTracksEventType,
		},

		TracksIDs: args.TracksIDs,
		UserID:    args.UserID,
		DeviceID:  args.DeviceID,
	}
}

type MpeRoomAddUserEvent struct {
	brainy.EventWithType

	UserHasBeenInvited bool
	UserID             string `validate:"required,uuid"`
}

type NewMpeRoomAddUserEventArgs struct {
	UserID             string
	UserHasBeenInvited bool
}

func NewMpeRoomAddUserEvent(args NewMpeRoomAddUserEventArgs) MpeRoomAddUserEvent {
	return MpeRoomAddUserEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeRoomAddUserEventType,
		},

		UserHasBeenInvited: args.UserHasBeenInvited,
		UserID:             args.UserID,
	}
}

type MpeRoomRemoveUserEvent struct {
	brainy.EventWithType

	UserID string `validate:"required,uuid"`
}

type NewMpeRoomRemoveUserEventArgs struct {
	UserID string
}

func NewMpeRoomRemoveUserEvent(args NewMpeRoomRemoveUserEventArgs) MpeRoomRemoveUserEvent {
	return MpeRoomRemoveUserEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeRoomRemoveUserEventType,
		},

		UserID: args.UserID,
	}
}

type MpeExportToMtvRoomEvent struct {
	brainy.EventWithType

	UserID         string                            `validate:"required,uuid"`
	DeviceID       string                            `validate:"required,uuid"`
	MtvRoomOptions shared_mtv.MtvRoomCreationOptions `validate:"required"`
}

type NewMpeExportToMtvRoomEventArgs struct {
	UserID         string
	DeviceID       string
	MtvRoomOptions shared_mtv.MtvRoomCreationOptions
}

func NewMpeExportToMtvRoomEvent(args NewMpeExportToMtvRoomEventArgs) MpeExportToMtvRoomEvent {
	return MpeExportToMtvRoomEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeExportToMtvRoomEventType,
		},

		UserID:         args.UserID,
		DeviceID:       args.DeviceID,
		MtvRoomOptions: args.MtvRoomOptions,
	}
}
