package shared

import (
	"fmt"

	"github.com/senseyeio/duration"
)

const ControlTaskQueue = "CONTROL_TASK_QUEUE"

var (
	SignalChannelName = "control"
	MtvGetStateQuery  = "getState"
)

type TrackMetadata struct {
	ID         string            `json:"id"`
	Title      string            `json:"title"`
	ArtistName string            `json:"artistName"`
	Duration   duration.Duration `json:"duration"`
}

type ControlState struct {
	Playing       bool            `json:"playing"`
	Name          string          `json:"name"`
	Users         []string        `json:"users"`
	TracksIDsList []string        `json:"tracksIDsList"`
	Tracks        []TrackMetadata `json:"tracks"`
}

func (state *ControlState) Pause() {
	if state.Playing {
		state.Playing = false
		fmt.Println("PAUSED")
	} else {
		fmt.Println("PAUSED FAILED")
	}
}

func (state *ControlState) Play() {
	if !state.Playing {
		state.Playing = true
		fmt.Println("PLAYED")
	} else {
		fmt.Println("PLAYED FAILED")
	}
}

func (state *ControlState) Join(userID string) {
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
	Route      SignalRoute
	WorkflowID string
}

type NewPlaySignalArgs struct {
	WorkflowID string
}

func NewPlaySignal(args NewPlaySignalArgs) PlaySignal {
	return PlaySignal{
		Route:      SignalRoutePlay,
		WorkflowID: args.WorkflowID,
	}
}

type PauseSignal struct {
	Route      SignalRoute
	WorkflowID string
}

type NewPauseSignalArgs struct {
	WorkflowID string
}

func NewPauseSignal(args NewPauseSignalArgs) PauseSignal {
	return PauseSignal{
		Route:      SignalRoutePause,
		WorkflowID: args.WorkflowID,
	}
}

type JoinSignal struct {
	Route      SignalRoute
	UserID     string
	WorkflowID string
}

type NewJoinSignalArgs struct {
	UserID     string
	WorkflowID string
}

func NewJoinSignal(args NewJoinSignalArgs) JoinSignal {
	return JoinSignal{
		Route:      SignalRouteJoin,
		UserID:     args.UserID,
		WorkflowID: args.WorkflowID,
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
