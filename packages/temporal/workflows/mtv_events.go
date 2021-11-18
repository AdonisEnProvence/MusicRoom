package workflows

import (
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/Devessier/brainy"
)

type MtvRoomTimerExpirationEvent struct {
	brainy.EventWithType

	Timer  shared.MtvRoomTimer
	Reason shared.MtvRoomTimerExpiredReason
}

func NewMtvRoomTimerExpirationEvent(t shared.MtvRoomTimer, reason shared.MtvRoomTimerExpiredReason) MtvRoomTimerExpirationEvent {

	return MtvRoomTimerExpirationEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomTimerExpiredEvent,
		},
		Timer:  t,
		Reason: reason,
	}
}

type MtvRoomInitialTracksFetchedEvent struct {
	brainy.EventWithType

	Tracks []shared.TrackMetadata
}

func NewMtvRoomInitialTracksFetchedEvent(tracks []shared.TrackMetadata) MtvRoomInitialTracksFetchedEvent {
	return MtvRoomInitialTracksFetchedEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomInitialTracksFetched,
		},
		Tracks: tracks,
	}
}

type MtvRoomUserLeavingRoomEvent struct {
	brainy.EventWithType

	UserID string
}

func NewMtvRoomUserLeavingRoomEvent(userID string) MtvRoomUserLeavingRoomEvent {
	return MtvRoomUserLeavingRoomEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomRemoveUserEvent,
		},

		UserID: userID,
	}
}

type MtvRoomUserVoteForTrackEvent struct {
	brainy.EventWithType

	UserID  string
	TrackID string
}

func NewMtvRoomUserVoteForTrackEvent(userID string, trackID string) MtvRoomUserVoteForTrackEvent {
	return MtvRoomUserVoteForTrackEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomVoteForTrackEvent,
		},

		UserID:  userID,
		TrackID: trackID,
	}
}

type MtvRoomUserJoiningRoomEvent struct {
	brainy.EventWithType

	User shared.InternalStateUser
}

func NewMtvRoomUserJoiningRoomEvent(user shared.InternalStateUser) MtvRoomUserJoiningRoomEvent {
	return MtvRoomUserJoiningRoomEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomAddUserEvent,
		},

		User: user,
	}
}

type MtvRoomChangeUserEmittingDeviceEvent struct {
	brainy.EventWithType

	UserID   string
	DeviceID string
}

func NewMtvRoomChangeUserEmittingDeviceEvent(userID string, deviceID string) MtvRoomChangeUserEmittingDeviceEvent {
	return MtvRoomChangeUserEmittingDeviceEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomChangeUserEmittingDevice,
		},

		UserID:   userID,
		DeviceID: deviceID,
	}
}

type MtvRoomSuggestTracksEvent struct {
	brainy.EventWithType

	TracksToSuggest []string
	UserID          string
	DeviceID        string
}

type NewMtvRoomSuggestTracksEventArgs struct {
	TracksToSuggest []string
	UserID          string
	DeviceID        string
}

func NewMtvRoomSuggestTracksEvent(args NewMtvRoomSuggestTracksEventArgs) MtvRoomSuggestTracksEvent {
	return MtvRoomSuggestTracksEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomSuggestTracks,
		},

		TracksToSuggest: args.TracksToSuggest,
		UserID:          args.UserID,
		DeviceID:        args.DeviceID,
	}
}

type MtvRoomSuggestedTracksFetchedEvent struct {
	brainy.EventWithType

	SuggestedTracksInformation []shared.TrackMetadata
	UserID                     string
	DeviceID                   string
}

type NewMtvRoomSuggestedTracksFetchedEventArgs struct {
	SuggestedTracksInformation []shared.TrackMetadata
	UserID                     string
	DeviceID                   string
}

func NewMtvRoomSuggestedTracksFetchedEvent(args NewMtvRoomSuggestedTracksFetchedEventArgs) MtvRoomSuggestedTracksFetchedEvent {
	return MtvRoomSuggestedTracksFetchedEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomSuggestedTracksFetched,
		},

		SuggestedTracksInformation: args.SuggestedTracksInformation,
		UserID:                     args.UserID,
		DeviceID:                   args.DeviceID,
	}
}

type MtvRoomCheckForScoreUdpateIntervalExpirationEvent struct {
	brainy.EventWithType
}

func NewMtvRoomCheckForScoreUpdateIntervalExpirationEvent() MtvRoomCheckForScoreUdpateIntervalExpirationEvent {
	return MtvRoomCheckForScoreUdpateIntervalExpirationEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvCheckForScoreUpdateIntervalExpirationEvent,
		},
	}
}

type MtvRoomUpdateUserFitsPositionConstraintEvent struct {
	brainy.EventWithType

	UserID                     string
	UserFitsPositionConstraint bool
}

func NewMtvRoomUpdateUserFitsPositionConstraintEvent(userID string, userFitsPositionConstraint bool) MtvRoomUpdateUserFitsPositionConstraintEvent {
	return MtvRoomUpdateUserFitsPositionConstraintEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomUpdateUserFitsPositionConstraint,
		},

		UserID:                     userID,
		UserFitsPositionConstraint: userFitsPositionConstraint,
	}
}

type MtvRoomUpdateDelegationOwnerEvent struct {
	brainy.EventWithType

	NewDelegationOwnerUserID string
	EmitterUserID            string
}

func NewMtvRoomUpdateDelegationOwnerEvent(newDelegationOwnerUserID string, emitterUserID string) MtvRoomUpdateDelegationOwnerEvent {
	return MtvRoomUpdateDelegationOwnerEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomUpdateDelegationOwner,
		},

		NewDelegationOwnerUserID: newDelegationOwnerUserID,
		EmitterUserID:            emitterUserID,
	}
}

type MtvRoomUpdateControlAndDelegationPermissionEvent struct {
	brainy.EventWithType

	ToUpdateUserID                    string
	HasControlAndDelegationPermission bool
}

type NewMtvRoomUpdateControlAndDelegationPermissionEventArgs struct {
	ToUpdateUserID                    string
	HasControlAndDelegationPermission bool
}

func NewMtvRoomUpdateControlAndDelegationPermissionEvent(args NewMtvRoomUpdateControlAndDelegationPermissionEventArgs) MtvRoomUpdateControlAndDelegationPermissionEvent {
	return MtvRoomUpdateControlAndDelegationPermissionEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomControlAndDelegationPermission,
		},

		ToUpdateUserID:                    args.ToUpdateUserID,
		HasControlAndDelegationPermission: args.HasControlAndDelegationPermission,
	}
}

type MtvRoomPlayEvent struct {
	brainy.EventWithType

	UserID string
}

type NewMtvRoomPlayEventArgs struct {
	UserID string
}

func NewMtvRoomPlayEvent(args NewMtvRoomPlayEventArgs) MtvRoomPlayEvent {
	return MtvRoomPlayEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomPlay,
		},

		UserID: args.UserID,
	}
}

type MtvRoomPauseEvent struct {
	brainy.EventWithType

	UserID string
}

type NewMtvRoomPauseEventArgs struct {
	UserID string
}

func NewMtvRoomPauseEvent(args NewMtvRoomPauseEventArgs) MtvRoomPauseEvent {
	return MtvRoomPauseEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomPause,
		},

		UserID: args.UserID,
	}
}

type MtvRoomGoToNextTrackEvent struct {
	brainy.EventWithType

	UserID string
}

type NewMtvRoomGoToNextTrackEventArgs struct {
	UserID string
}

func NewMtvRoomGoToNextTrackEvent(args NewMtvRoomGoToNextTrackEventArgs) MtvRoomGoToNextTrackEvent {
	return MtvRoomGoToNextTrackEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvRoomGoToNextTrack,
		},

		UserID: args.UserID,
	}
}

type MtvRoomTimeConstraintTimerExpirationEvent struct {
	brainy.EventWithType

	TimeConstraintValue bool
}

type NewMtvRoomTimeConstraintTimerExpirationEventArgs struct {
	TimeConstraintValue bool
}

func NewMtvHandlerTimeConstraintTimerExpirationEvent(args NewMtvRoomTimeConstraintTimerExpirationEventArgs) MtvRoomTimeConstraintTimerExpirationEvent {
	return MtvRoomTimeConstraintTimerExpirationEvent{
		EventWithType: brainy.EventWithType{
			Event: MtvHandlerTimeConstraintTimerExpirationEvent,
		},
		TimeConstraintValue: args.TimeConstraintValue,
	}
}
