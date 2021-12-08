package shared_mpe

import "github.com/AdonisEnProvence/MusicRoom/shared"

const (
	SignalAddTracks shared.SignalRoute = "add-tracks"
)

type AddTracksSignal struct {
	Route     shared.SignalRoute `validate:"required"`
	TracksIDs []string           `validate:"required,dive,required`
}

type NewAddTracksSignalArgs struct {
	TracksIDs []string
}

func NewAddTracksSignal(args NewAddTracksSignalArgs) AddTracksSignal {
	return AddTracksSignal{
		Route:     SignalAddTracks,
		TracksIDs: args.TracksIDs,
	}
}
