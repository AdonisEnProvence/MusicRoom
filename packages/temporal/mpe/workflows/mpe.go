package mpe

import (
	"errors"
	"fmt"
	"time"

	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"

	"github.com/Devessier/brainy"

	"go.temporal.io/sdk/workflow"
)

var (
	ErrRoomDoesNotHaveConstraints = errors.New("room does not have constraints")
)

type MpeRoomInternalState struct {
	initialParams shared_mpe.MpeRoomParameters
	Machine       *brainy.Machine
	Users         map[string]*shared_mpe.InternalStateUser
}

func (s *MpeRoomInternalState) AddUser(user shared_mpe.InternalStateUser) {
	//Do not override user if already exist
	if _, ok := s.Users[user.UserID]; !ok {
		s.Users[user.UserID] = &user
	} else {
		fmt.Printf("\n User %s already existing in s.Users\n", user.UserID)
	}
}

//This method will merge given params in the internalState
func (s *MpeRoomInternalState) FillWith(params shared_mpe.MpeRoomParameters) {
	s.initialParams = params
	s.Users = make(map[string]*shared_mpe.InternalStateUser)
	s.AddUser(*params.CreatorUserRelatedInformation)
}

// In the internalState.Export method we do not use workflow.sideEffect for at least two reasons:
// 1- we cannot use workflow.sideEffect in the getState queryHandler
// 2- we never update our internalState depending on internalState.Export() results this data aims to be sent to adonis.
func (s *MpeRoomInternalState) Export(RelatedUserID string) shared_mpe.MpeRoomExposedState {

	exposedState := shared_mpe.MpeRoomExposedState{
		UsersLength:                   len(s.Users),
		RoomID:                        s.initialParams.RoomID,
		RoomName:                      s.initialParams.RoomName,
		RoomCreatorUserID:             s.initialParams.RoomCreatorUserID,
		IsOpen:                        s.initialParams.IsOpen,
		IsOpenOnlyInvitedUsersCanEdit: s.initialParams.IsOpenOnlyInvitedUsersCanEdit,
	}

	return exposedState
}

const (
	MtvRoomInit brainy.StateType = "init"

	MtvRoomPlay brainy.EventType = "PLAY"
)

func getNowFromSideEffect(ctx workflow.Context) time.Time {
	var now time.Time
	encoded := workflow.SideEffect(ctx, func(ctx workflow.Context) interface{} {
		return TimeWrapper()
	})
	encoded.Get(&now)
	return now
}

func MpeRoomWorkflow(ctx workflow.Context, params shared_mpe.MpeRoomParameters) error {
	var (
		err           error
		internalState MpeRoomInternalState
	)

	logger := workflow.GetLogger(ctx)

	//Checking params
	rootNow := getNowFromSideEffect(ctx)
	if err := params.CheckParamsValidity(rootNow); err != nil {
		logger.Info("Workflow creation failed", "Error", err)
		return err
	}
	///
	internalState.FillWith(params)

	if err := workflow.SetQueryHandler(
		ctx,
		shared_mpe.MpeGetStateQuery,
		func(userID string) (shared_mpe.MpeRoomExposedState, error) {

			exposedState := internalState.Export(userID)

			return exposedState, nil
		},
	); err != nil {
		logger.Info("SetQueryHandler for MtvGetStateQuery failed.", "Error", err)
		return err
	}

	channel := workflow.GetSignalChannel(ctx, shared_mpe.SignalChannelName)

	var (
		terminated         = false
		workflowFatalError error
		// fetchedInitialTracksFuture workflow.Future
	)

	//create machine here
	internalState.Machine, err = brainy.NewMachine(brainy.StateNode{})

	if err != nil {
		fmt.Printf("machine error : %v\n", err)
		return err
	}

	for {
		selector := workflow.NewSelector(ctx)

		selector.AddReceive(channel, func(c workflow.ReceiveChannel, _ bool) {
			var signal interface{}
			c.Receive(ctx, &signal)

			// var routeSignal shared_mpe.GenericRouteSignal

			// if err := mapstructure.Decode(signal, &routeSignal); err != nil {
			// 	logger.Error("Invalid signal type %v", err)
			// 	return
			// }

			// switch routeSignal.Route {

			// case shared_mpe.SignalUpdateControlAndDelegationPermission:
			// 	var message shared_mpe.UpdateControlAndDelegationPermissionSignal

			// 	if err := mapstructure.Decode(signal, &message); err != nil {
			// 		logger.Error("Invalid signal type %v", err)
			// 		return
			// 	}
			// 	if err := workflows_shared_mpe.Validate.Struct(message); err != nil {
			// 		logger.Error("Validation error: %v", err)
			// 		return
			// 	}

			// 	internalState.Machine.Send(
			// 		NewMtvRoomUpdateControlAndDelegationPermissionEvent(NewMtvRoomUpdateControlAndDelegationPermissionEventArgs{
			// 			ToUpdateUserID:                    message.ToUpdateUserID,
			// 			HasControlAndDelegationPermission: message.HasControlAndDelegationPermission,
			// 		}),
			// 	)

			// case shared_mpe.SignalRouteTerminate:
			// 	terminated = true
			// }
		})

		// Room Is Ready callback
		// if fetchedInitialTracksFuture != nil {
		// 	selector.AddFuture(fetchedInitialTracksFuture, func(f workflow.Future) {
		// 		fetchedInitialTracksFuture = nil

		// 		var initialTracksActivityResult []shared_mpe.TrackMetadata

		// 		if err := f.Get(ctx, &initialTracksActivityResult); err != nil {
		// 			logger.Error("error occured initialTracksActivityResult", err)

		// 			return
		// 		}

		// 		// internalState.Machine.Send(
		// 		// 	NewMtvRoomInitialTracksFetchedEvent(initialTracksActivityResult),
		// 		// )
		// 	})
		// }
		/////

		selector.Select(ctx)

		if terminated || workflowFatalError != nil {
			break
		}
	}

	return workflowFatalError
}

// func acknowledgeRoomCreation(ctx workflow.Context, state shared_mpe.MpeRoomExposedState) error {
// 	ao := workflow.ActivityOptions{
// 		ScheduleToStartTimeout: time.Minute,
// 		StartToCloseTimeout:    time.Minute,
// 	}
// 	ctx = workflow.WithActivityOptions(ctx, ao)

// 	if err := workflow.ExecuteActivity(
// 		ctx,
// 		activities.CreationAcknowledgementActivity,
// 		state,
// 	).Get(ctx, nil); err != nil {
// 		return err
// 	}

// 	return nil
// }

type TimeWrapperType func() time.Time

var TimeWrapper TimeWrapperType = time.Now