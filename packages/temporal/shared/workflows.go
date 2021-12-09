package shared

// NoWorkflowRunID is meant to be used to signal/query a workflow
// when you do not know the current run id, or when you do not want to rely on it.
//
// See documentation for SignalWorkflow method: https://pkg.go.dev/go.temporal.io/sdk@v1.12.0/client#Client.
const NoWorkflowRunID = ""
