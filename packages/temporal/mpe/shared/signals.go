package shared_mpe

import (
	shared_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/shared"
	"github.com/AdonisEnProvence/MusicRoom/shared"
)

const (
	SignalAddTracks         shared.SignalRoute = "add-tracks"
	SignalChangeTrackOrder  shared.SignalRoute = "change-track-order"
	SignalDeleteTracks      shared.SignalRoute = "delete-tracks"
	SignalAddUser           shared.SignalRoute = "add-user"
	SignalRemoveUser        shared.SignalRoute = "remove-user"
	SignalExportToMtvRoom   shared.SignalRoute = "export-to-mtv-room"
	SignalTerminateWorkflow shared.SignalRoute = "terminate-workflow"
)

type AddTracksSignal struct {
	Route     shared.SignalRoute `validate:"required"`
	TracksIDs []string           `validate:"required,dive,required"`
	UserID    string             `validate:"required"`
	DeviceID  string             `validate:"required"`
}

type NewAddTracksSignalArgs struct {
	TracksIDs []string
	UserID    string
	DeviceID  string
}

func NewAddTracksSignal(args NewAddTracksSignalArgs) AddTracksSignal {
	return AddTracksSignal{
		Route:     SignalAddTracks,
		TracksIDs: args.TracksIDs,
		UserID:    args.UserID,
		DeviceID:  args.DeviceID,
	}
}

type ChangeTrackOrderSignal struct {
	Route shared.SignalRoute `validate:"required"`

	TrackID          string                   `validate:"required"`
	UserID           string                   `validate:"required"`
	DeviceID         string                   `validate:"required"`
	OperationToApply MpeOperationToApplyValue `validate:"required"`
	FromIndex        int                      `validate:"min=0"`
}

type NewChangeTrackOrderSignalArgs struct {
	TrackID          string
	UserID           string
	DeviceID         string
	OperationToApply MpeOperationToApplyValue
	FromIndex        int `validate:"min=0"`
}

func NewChangeTrackOrderSignal(args NewChangeTrackOrderSignalArgs) ChangeTrackOrderSignal {
	return ChangeTrackOrderSignal{
		Route:            SignalChangeTrackOrder,
		TrackID:          args.TrackID,
		UserID:           args.UserID,
		DeviceID:         args.DeviceID,
		OperationToApply: args.OperationToApply,
		FromIndex:        args.FromIndex,
	}
}

type DeleteTracksSignal struct {
	Route shared.SignalRoute `validate:"required"`

	TracksIDs []string `validate:"required,dive,required"`
	UserID    string   `validate:"required"`
	DeviceID  string   `validate:"required"`
}

type NewDeleteTracksSignalArgs struct {
	TracksIDs []string
	UserID    string
	DeviceID  string
}

func NewDeleteTracksSignal(args NewDeleteTracksSignalArgs) DeleteTracksSignal {
	return DeleteTracksSignal{
		Route: SignalDeleteTracks,

		TracksIDs: args.TracksIDs,
		UserID:    args.UserID,
		DeviceID:  args.DeviceID,
	}
}

type AddUserSignal struct {
	Route shared.SignalRoute `validate:"required"`

	UserID             string `validate:"required"`
	UserHasBeenInvited bool
}

type NewAddUserSignalArgs struct {
	UserID             string
	UserHasBeenInvited bool
}

func NewAddUserSignal(args NewAddUserSignalArgs) AddUserSignal {
	return AddUserSignal{
		Route: SignalAddUser,

		UserID:             args.UserID,
		UserHasBeenInvited: args.UserHasBeenInvited,
	}
}

type RemoveUserSignal struct {
	Route shared.SignalRoute `validate:"required"`

	UserID string `validate:"required"`
}

type NewRemoveUserSignalArgs struct {
	UserID string
}

func NewRemoveUserSignal(args NewRemoveUserSignalArgs) RemoveUserSignal {
	return RemoveUserSignal{
		Route: SignalRemoveUser,

		UserID: args.UserID,
	}
}

type ExportToMtvRoomSignal struct {
	Route shared.SignalRoute `validate:"required"`

	UserID         string                            `validate:"required,uuid"`
	DeviceID       string                            `validate:"required,uuid"`
	MtvRoomOptions shared_mtv.MtvRoomCreationOptions `validate:"required"`
}

type ExportToMtvRoomSignalArgs struct {
	UserID         string
	DeviceID       string
	MtvRoomOptions shared_mtv.MtvRoomCreationOptions
}

func NewExportToMtvRoomSignal(args ExportToMtvRoomSignalArgs) ExportToMtvRoomSignal {
	return ExportToMtvRoomSignal{
		Route: SignalExportToMtvRoom,

		UserID:         args.UserID,
		DeviceID:       args.DeviceID,
		MtvRoomOptions: args.MtvRoomOptions,
	}
}

type TerminateWorkflowSignal struct {
	Route shared.SignalRoute `validate:"required"`
}

func NewTerminateWorkflowSignal() TerminateWorkflowSignal {
	return TerminateWorkflowSignal{
		Route: SignalTerminateWorkflow,
	}
}
