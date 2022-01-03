package shared_mpe

import "github.com/AdonisEnProvence/MusicRoom/shared"

const (
	SignalAddTracks        shared.SignalRoute = "add-tracks"
	SignalChangeTrackOrder shared.SignalRoute = "change-track-order"
	SignalDeleteTracks     shared.SignalRoute = "delete-tracks"
	SignalAddUser          shared.SignalRoute = "add-user"
	SignalRemoveUser       shared.SignalRoute = "remove-user"
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
