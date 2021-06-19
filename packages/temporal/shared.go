// @@@SNIPSTART hello-world-project-template-go-shared
package app

const ControlTaskQueue = "CONTROL_TASK_QUEUE"

var (
	SignalChannelName = "control"
)

var RouteTypes = struct {
	PLAY      string
	PAUSE     string
	JOIN      string
	TERMINATE string
}{
	PLAY:      "play",
	PAUSE:     "pause",
	JOIN:      "join",
	TERMINATE: "terminate",
}

type RouteSignal struct {
	Route string
}

type PlaySignal struct {
	Route      string
	WorkflowID string
}

type PauseSignal struct {
	Route      string
	WorkflowID string
}

type JoinSignal struct {
	Route      string
	UserID     string
	WorkflowID string
}

type TerminateSignal struct {
	Route string
}

// @@@SNIPEND
