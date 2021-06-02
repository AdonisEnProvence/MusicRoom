// @@@SNIPSTART hello-world-project-template-go-activity
package app

import (
	"fmt"
)

func ComposeGreeting(name string) (string, error) {
	greeting := fmt.Sprintf("Hello %s!", name)
	return greeting, nil
}
// @@@SNIPEND
