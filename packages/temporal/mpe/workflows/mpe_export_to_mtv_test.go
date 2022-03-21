package mpe

import (
	"testing"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/activities"
	activities_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/activities"
	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	shared_mtv "github.com/AdonisEnProvence/MusicRoom/mtv/shared"
	"github.com/AdonisEnProvence/MusicRoom/random"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/bxcodec/faker/v3"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
	"go.temporal.io/sdk/workflow"
)

func generateMtvRoomCreationOptionsWithPlaceID() shared_mtv.MtvRoomCreationOptionsFromExportWithPlaceID {
	return shared_mtv.MtvRoomCreationOptionsFromExportWithPlaceID{
		RoomName:                      faker.Word(),
		MinimumScoreToBePlayed:        10,
		IsOpen:                        true,
		IsOpenOnlyInvitedUsersCanVote: false,
		HasPhysicalAndTimeConstraints: false,
		PhysicalAndTimeConstraints:    nil,
		PlayingMode:                   shared_mtv.MtvPlayingModeBroadcast,
	}
}

type MpeExportToMtvTestUnit struct {
	UnitTestSuite
}

func (s *MpeExportToMtvTestUnit) Test_CreatorExportsMpeToMtv() {
	var a *activities_mpe.Activities

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	initialTracksIDs := []string{tracks[0].ID}
	mtvRoomOptions := generateMtvRoomCreationOptionsWithPlaceID()

	params, roomCreatorDeviceID := s.getWorkflowInitParams(initialTracksIDs)
	defaultDuration := 200 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.MpeCreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	s.env.OnActivity(
		a.SendMtvRoomCreationRequestToServerActivity,
		mock.Anything,
		activities_mpe.SendMtvRoomCreationRequestToServerActivityArgs{
			UserID:         params.RoomCreatorUserID,
			DeviceID:       roomCreatorDeviceID,
			MtvRoomOptions: mtvRoomOptions,
			TracksIDs:      initialTracksIDs,
		},
	).Return(nil).Once()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitExportToMtvRoomSignal(shared_mpe.ExportToMtvRoomSignalArgs{
			UserID:         params.RoomCreatorUserID,
			DeviceID:       roomCreatorDeviceID,
			MtvRoomOptions: mtvRoomOptions,
		})
	}, init)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *MpeExportToMtvTestUnit) Test_UserInRoomExportsMpeToMtv() {
	var a *activities_mpe.Activities

	joiningUserID := faker.UUIDHyphenated()
	joiningUserDeviceID := faker.UUIDHyphenated()
	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	initialTracksIDs := []string{tracks[0].ID}
	mtvRoomOptions := generateMtvRoomCreationOptionsWithPlaceID()

	params, _ := s.getWorkflowInitParams(initialTracksIDs)
	defaultDuration := 200 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.MpeCreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	s.env.OnActivity(
		a.SendMtvRoomCreationRequestToServerActivity,
		mock.Anything,
		activities_mpe.SendMtvRoomCreationRequestToServerActivityArgs{
			UserID:         joiningUserID,
			DeviceID:       joiningUserDeviceID,
			MtvRoomOptions: mtvRoomOptions,
			TracksIDs:      initialTracksIDs,
		},
	).Return(nil).Once()

	addUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitAddUserSignal(shared_mpe.NewAddUserSignalArgs{
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		})
	}, addUser)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(2, mpeState.UsersLength)
	}, checkJoinWorked)

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitExportToMtvRoomSignal(shared_mpe.ExportToMtvRoomSignalArgs{
			UserID:         joiningUserID,
			DeviceID:       joiningUserDeviceID,
			MtvRoomOptions: mtvRoomOptions,
		})
	}, init)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *MpeExportToMtvTestUnit) Test_UserExportsMpeRoomIntoMtvRoomWithConstraints() {
	var a *activities_mpe.Activities
	defaultDuration := 200 * time.Millisecond

	joiningUserID := faker.UUIDHyphenated()
	joiningUserDeviceID := faker.UUIDHyphenated()
	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	initialTracksIDs := []string{tracks[0].ID}
	//Avoiding monotonic clock to fail mock assertion
	//see https://stackoverflow.com/questions/51165616/unexpected-output-from-time-time
	now := time.Now().Round(0)
	start := now
	end := start.Add(defaultDuration * 5000)

	mtvRoomOptions := shared_mtv.MtvRoomCreationOptionsFromExportWithPlaceID{
		HasPhysicalAndTimeConstraints: true,
		IsOpen:                        true,
		IsOpenOnlyInvitedUsersCanVote: false,
		MinimumScoreToBePlayed:        1,
		PlayingMode:                   shared_mtv.MtvPlayingModeBroadcast,
		PhysicalAndTimeConstraints: &shared_mtv.MtvRoomPhysicalAndTimeConstraintsWithPlaceID{
			PhysicalConstraintEndsAt:   end,
			PhysicalConstraintStartsAt: start,
			PhysicalConstraintPlaceID:  "position-place-id",
			PhysicalConstraintRadius:   5000,
		},
		RoomName: "room with constraints",
	}

	params, _ := s.getWorkflowInitParams(initialTracksIDs)
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.MpeCreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	s.env.OnActivity(
		a.SendMtvRoomCreationRequestToServerActivity,
		mock.Anything,
		activities_mpe.SendMtvRoomCreationRequestToServerActivityArgs{
			UserID:         joiningUserID,
			DeviceID:       joiningUserDeviceID,
			MtvRoomOptions: mtvRoomOptions,
			TracksIDs:      initialTracksIDs,
		},
	).Return(nil).Once()

	addUser := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitAddUserSignal(shared_mpe.NewAddUserSignalArgs{
			UserID:             joiningUserID,
			UserHasBeenInvited: false,
		})
	}, addUser)

	checkJoinWorked := defaultDuration
	registerDelayedCallbackWrapper(func() {
		mpeState := s.getMpeState(shared_mpe.NoRelatedUserID)

		s.Equal(2, mpeState.UsersLength)
	}, checkJoinWorked)

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitExportToMtvRoomSignal(shared_mpe.ExportToMtvRoomSignalArgs{
			UserID:         joiningUserID,
			DeviceID:       joiningUserDeviceID,
			MtvRoomOptions: mtvRoomOptions,
		})
	}, init)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func (s *MpeExportToMtvTestUnit) Test_UserNotInRoomCanNotExportMpeToMtv() {
	var a *activities_mpe.Activities

	tracks := []shared.TrackMetadata{
		{
			ID:         faker.UUIDHyphenated(),
			Title:      faker.Word(),
			ArtistName: faker.Name(),
			Duration:   random.GenerateRandomDuration(),
		},
	}
	initialTracksIDs := []string{tracks[0].ID}
	mtvRoomOptions := generateMtvRoomCreationOptionsWithPlaceID()

	params, _ := s.getWorkflowInitParams(initialTracksIDs)
	defaultDuration := 200 * time.Millisecond
	resetMock, registerDelayedCallbackWrapper := s.initTestEnv()

	defer resetMock()

	s.env.OnActivity(
		activities.FetchTracksInformationActivity,
		mock.Anything,
		initialTracksIDs,
	).Return(tracks, nil).Once()
	s.env.OnActivity(
		a.MpeCreationAcknowledgementActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Once()

	s.env.OnActivity(
		a.SendMtvRoomCreationRequestToServerActivity,
		mock.Anything,
		mock.Anything,
	).Return(nil).Never()

	init := defaultDuration
	registerDelayedCallbackWrapper(func() {
		s.emitExportToMtvRoomSignal(shared_mpe.ExportToMtvRoomSignalArgs{
			UserID:         faker.UUIDHyphenated(),
			DeviceID:       faker.UUIDHyphenated(),
			MtvRoomOptions: mtvRoomOptions,
		})
	}, init)

	s.env.ExecuteWorkflow(MpeRoomWorkflow, params)

	s.True(s.env.IsWorkflowCompleted())
	err := s.env.GetWorkflowError()
	s.ErrorIs(err, workflow.ErrDeadlineExceeded, "The workflow ran on an infinite loop")
}

func TestMpeExportToMtvUnitTestSuite(t *testing.T) {
	suite.Run(t, new(MpeExportToMtvTestUnit))
}
