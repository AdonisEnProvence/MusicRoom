package shared_mpe

import "github.com/AdonisEnProvence/MusicRoom/shared"

const (
	SignalAddTracks        shared.SignalRoute = "add-tracks"
	SignalChangeTrackOrder shared.SignalRoute = "change-track-order"
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
	//Using a pointer on int to avoid validator to throw an error with fromIndex = 0
	FromIndex *int `json:"fromIndex" validate:"required"`
}

type NewChangeTrackOrderSignalArgs struct {
	TrackID          string
	UserID           string
	DeviceID         string
	OperationToApply MpeOperationToApplyValue
	//Using a pointer on int to avoid validator to throw an error with fromIndex = 0
	FromIndex *int `json:"fromIndex" validate:"required"`
}

func NewChangeTrackOrderSignal(args NewChangeTrackOrderSignalArgs) ChangeTrackOrderSignal {
	return ChangeTrackOrderSignal{
		Route:            SignalChangeTrackOrder,
		TrackID:          args.TrackID,
		UserID:           args.UserID,
		DeviceID:         args.DeviceID,
		OperationToApply: args.OperationToApply,
	}
}
