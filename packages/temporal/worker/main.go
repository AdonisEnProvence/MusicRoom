// @@@SNIPSTART hello-world-project-template-go-worker
package main

import (
	"log"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"

	"hello-world-project-template-go/app"
)

func main() {
	// Create the client object just once per process
	c, err := client.NewClient(client.Options{})
	if err != nil {
		log.Fatalln("unable to create Temporal client", err)
	}
	defer c.Close()
	// This worker hosts both Worker and Activity functions
	w := worker.New(c, app.ControlTaskQueue, worker.Options{})
	w.RegisterWorkflow(app.ControlWorkflow)
	w.RegisterActivity(app.PingActivity)
	w.RegisterActivity(app.PlayActivity)
	w.RegisterActivity(app.PauseActivity)
	w.RegisterActivity(app.JoinActivity)
	// Start listening to the Task Queue
	err = w.Run(worker.InterruptCh())
	if err != nil {
		log.Fatalln("unable to start Worker", err)
	}
}

// @@@SNIPEND
