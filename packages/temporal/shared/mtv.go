package shared

import (
	"time"
)

type MtvRoomTimerState string

const (
	MtvRoomTimerStateIdle     MtvRoomTimerState = "idle"
	MtvRoomTimerStatePending  MtvRoomTimerState = "pending"
	MtvRoomTimerStateFinished MtvRoomTimerState = "finished"
)

type MtvRoomTimer struct {
	State         MtvRoomTimerState
	Elapsed       time.Duration
	TotalDuration time.Duration
}

const ControlTaskQueue = "CONTROL_TASK_QUEUE"

var (
	SignalChannelName = "control"
	MtvGetStateQuery  = "getState"
)

type TrackMetadata struct {
	ID         string        `json:"id"`
	Title      string        `json:"title"`
	ArtistName string        `json:"artistName"`
	Duration   time.Duration `json:"duration"`
}

type ExposedTrackMetadata struct {
	TrackMetadata

	Duration int64 `json:"duration"`
}

func (t TrackMetadata) Export() ExposedTrackMetadata {
	return ExposedTrackMetadata{
		TrackMetadata: t,
		Duration:      t.Duration.Milliseconds(),
	}
}

type CurrentTrack struct {
	TrackMetadata

	Elapsed time.Duration `json:"elapsed"`
}

type ExposedCurrentTrack struct {
	CurrentTrack

	Duration int64 `json:"duration"`
	Elapsed  int64 `json:"elapsed"`
}

func (c CurrentTrack) Export() ExposedCurrentTrack {
	return ExposedCurrentTrack{
		CurrentTrack: c,
		Duration:     c.Duration.Milliseconds(),
		Elapsed:      c.Elapsed.Milliseconds(),
	}
}

type MtvRoomParameters struct {
	RoomID               string
	RoomCreatorUserID    string
	RoomName             string
	InitialUsers         []string
	InitialTracksIDsList []string
}

func (p MtvRoomParameters) Export() MtvRoomExposedState {
	return MtvRoomExposedState{
		RoomID:            p.RoomID,
		Playing:           false,
		RoomCreatorUserID: p.RoomCreatorUserID,
		RoomName:          p.RoomName,
		Users:             p.InitialUsers,
		TracksIDsList:     p.InitialTracksIDsList,
	}
}

type MtvRoomExposedState struct {
	RoomID            string                 `json:"roomID"`
	RoomCreatorUserID string                 `json:"roomCreatorUserID"`
	Playing           bool                   `json:"playing"`
	RoomName          string                 `json:"name"`
	Users             []string               `json:"users"`
	TracksIDsList     []string               `json:"tracksIDsList"`
	CurrentTrack      *ExposedCurrentTrack   `json:"currentTrack"`
	Tracks            []ExposedTrackMetadata `json:"tracks"`
}

type SignalRoute string

const (
	SignalRoutePlay          = "play"
	SignalRoutePause         = "pause"
	SignalRouteJoin          = "join"
	SignalRouteTerminate     = "terminate"
	SignalRouteGoToNextTrack = "go-to-next-track"
)

type GenericRouteSignal struct {
	Route SignalRoute
}

type PlaySignal struct {
	Route SignalRoute
}

type NewPlaySignalArgs struct {
}

func NewPlaySignal(args NewPlaySignalArgs) PlaySignal {
	return PlaySignal{
		Route: SignalRoutePlay,
	}
}

type PauseSignal struct {
	Route SignalRoute
}

type NewPauseSignalArgs struct {
}

func NewPauseSignal(args NewPauseSignalArgs) PauseSignal {
	return PauseSignal{
		Route: SignalRoutePause,
	}
}

type JoinSignal struct {
	Route  SignalRoute
	UserID string
}

type NewJoinSignalArgs struct {
	UserID string
}

func NewJoinSignal(args NewJoinSignalArgs) JoinSignal {
	return JoinSignal{
		Route:  SignalRouteJoin,
		UserID: args.UserID,
	}
}

type TerminateSignal struct {
	Route SignalRoute
}

type NewTerminateSignalArgs struct{}

func NewTerminateSignal(args NewTerminateSignalArgs) TerminateSignal {
	return TerminateSignal{
		Route: SignalRouteTerminate,
	}
}

type GoToNextTrackSignal struct {
	Route SignalRoute
}

func NewGoToNexTrackSignal() GoToNextTrackSignal {
	return GoToNextTrackSignal{
		Route: SignalRouteGoToNextTrack,
	}
}
