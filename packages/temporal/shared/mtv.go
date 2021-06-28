package shared

import (
	"fmt"
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

type MtvRoomState struct {
	RoomID            string          `json:"roomID"`
	RoomCreatorUserID string          `json:"roomCreatorUserID"`
	Playing           bool            `json:"playing"`
	Name              string          `json:"name"`
	Users             []string        `json:"users"`
	TracksIDsList     []string        `json:"tracksIDsList"`
	CurrentTrack      TrackMetadata   `json:"currentTrack"`
	Tracks            []TrackMetadata `json:"tracks"`
	Timer             MtvRoomTimer    `json:"-"`
}

func (state *MtvRoomState) Pause() {
	if state.Playing {
		state.Playing = false
		fmt.Println("PAUSED")
	} else {
		fmt.Println("PAUSED FAILED")
	}
}

func (state *MtvRoomState) Play() {
	if !state.Playing {
		state.Playing = true
		fmt.Println("PLAYED")
	} else {
		fmt.Println("PLAYED FAILED")
	}
}

func (state *MtvRoomState) Join(userID string) {
	state.Users = append(state.Users, userID)
}

type SignalRoute string

const (
	SignalRoutePlay      = "play"
	SignalRoutePause     = "pause"
	SignalRouteJoin      = "join"
	SignalRouteTerminate = "terminate"
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
