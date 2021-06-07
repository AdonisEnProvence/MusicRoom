// @@@SNIPSTART hello-world-project-template-go-shared
package app

const ControlTaskQueue = "CONTROL_TASK_QUEUE"

var (
	SignalChannelName = "control"
)

var RouteTypes = struct {
	PLAY  string
	PAUSE string
	JOIN  string
}{
	PLAY:  "play",
	PAUSE: "pause",
	JOIN:  "join",
}

type RouteSignal struct {
	Route string
}

type PlaySignal struct {
	Route string
}

type PauseSignal struct {
	Route string
}

type JoinSignal struct {
	Route  string
	UserID string
}

// @@@SNIPEND
