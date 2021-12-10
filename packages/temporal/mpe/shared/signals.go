package shared_mpe

import "github.com/AdonisEnProvence/MusicRoom/shared"

const (
	SignalAddTracks shared.SignalRoute = "add-tracks"
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
