// @@@SNIPSTART hello-world-project-template-go-shared
package app

const GreetingTaskQueue = "GREETING_TASK_QUEUE"
const ControlTaskQueue = "CONTROL_TASK_QUEUE"

var (
	SignalChannelName = "control"
)

var RouteTypes = struct {
	PLAY  string
	PAUSE string
}{
	PLAY:  "play",
	PAUSE: "pause",
}

type RouteSignal struct {
	Route string
}

type TogglePlaySignal struct {
	Route string
}

type TogglePauseSignal struct {
	Route string
}

// @@@SNIPEND
