package shared_mpe

import (
	"errors"
	"time"
)

var (
	SignalChannelName = "mpe_control"
	MpeGetStateQuery  = "getState"
	NoRelatedUserID   = ""
)

type InternalStateUser struct {
	UserID             string `json:"userID"`
	UserHasBeenInvited bool   `json:"userHasBeenInvited"`
}

type MpeRoomParameters struct {
	RoomID                        string
	RoomCreatorUserID             string
	RoomName                      string
	CreatorUserRelatedInformation *InternalStateUser
	InitialTrackID                string

	IsOpen                        bool
	IsOpenOnlyInvitedUsersCanEdit bool
}

const ControlTaskQueue = "CONTROL_TASK_QUEUE"

//This method will return an error if it determines that params are corrupted
func (p MpeRoomParameters) CheckParamsValidity(now time.Time) error {

	//Looking for OnlyInvitedUsersCan edit is enabled in private room error
	onlyInvitedUserTrueButRoomIsNotPublic := p.IsOpenOnlyInvitedUsersCanEdit && !p.IsOpen
	if onlyInvitedUserTrueButRoomIsNotPublic {
		return errors.New("IsOpenOnlyInvitedUsersCanEdit true but IsOpen false")
	}

	return nil
}

type TrackMetadata struct {
	ID         string        `json:"id"`
	Title      string        `json:"title"`
	ArtistName string        `json:"artistName"`
	Duration   time.Duration `json:"duration"`
}

type MpeRoomExposedState struct {
	RoomID            string `json:"roomID"`
	RoomCreatorUserID string `json:"roomCreatorUserID"`
	RoomName          string `json:"name"`
	// Tracks                        []TrackMetadata `json:"tracks"`
	UsersLength                   int  `json:"usersLength"`
	IsOpen                        bool `json:"isOpen"`
	IsOpenOnlyInvitedUsersCanEdit bool `json:"isOpenOnlyInvitedUsersCanVote"`
}
