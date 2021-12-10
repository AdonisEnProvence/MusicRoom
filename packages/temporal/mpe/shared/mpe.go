package shared_mpe

import (
	"errors"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/shared"
)

var (
	SignalChannelName = "mpe_control"
	MpeGetStateQuery  = "getState"
	NoRelatedUserID   = ""
)

type MpeOperationToApplyValue string

const (
	MpeOperationToApplyUp   MpeOperationToApplyValue = "UP"
	MpeOperationToApplyDown MpeOperationToApplyValue = "DOWN"
)

func (m MpeOperationToApplyValue) IsValid() bool {
	for _, mode := range MpeOperationToApplyAllValues {
		if mode == m {
			return true
		}
	}

	return false
}

var MpeOperationToApplyAllValues = [...]MpeOperationToApplyValue{MpeOperationToApplyUp, MpeOperationToApplyDown}

type InternalStateUser struct {
	UserID             string `json:"userID"`
	UserHasBeenInvited bool   `json:"userHasBeenInvited"`
}

type MpeRoomParameters struct {
	RoomID            string   `validate:"required"`
	RoomCreatorUserID string   `validate:"required"`
	RoomName          string   `validate:"required"`
	InitialTracksIDs  []string `validate:"min=1,required,dive,required"`

	CreatorUserRelatedInformation *InternalStateUser
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

type MpeRoomExposedState struct {
	RoomID                        string                 `json:"roomID"`
	RoomCreatorUserID             string                 `json:"roomCreatorUserID"`
	RoomName                      string                 `json:"name"`
	Tracks                        []shared.TrackMetadata `json:"tracks"`
	UsersLength                   int                    `json:"usersLength"`
	IsOpen                        bool                   `json:"isOpen"`
	IsOpenOnlyInvitedUsersCanEdit bool                   `json:"isOpenOnlyInvitedUsersCanEdit"`
	PlaylistTotalDuration         int                    `json:"playlistTotalDuration"`
}

type TrackMetadataSet struct {
	tracks []shared.TrackMetadata
}

func (s *TrackMetadataSet) Clear() {
	s.tracks = []shared.TrackMetadata{}
}

func (s *TrackMetadataSet) Has(trackID string) bool {
	for _, track := range s.tracks {
		if track.ID == trackID {
			return true
		}
	}

	return false
}

func (s *TrackMetadataSet) Add(track shared.TrackMetadata) error {
	if isDuplicate := s.Has(track.ID); isDuplicate {
		return errors.New("mpe add track failed, track already in set")
	}

	s.tracks = append(s.tracks, track)
	return nil
}

func (s *TrackMetadataSet) Init() {
	s.tracks = []shared.TrackMetadata{}
}

func (s *TrackMetadataSet) Values() []shared.TrackMetadata {
	return s.tracks[:]
}

//Returns -1 if element is not found
func (s *TrackMetadataSet) IndexOf(trackID string) (int, bool) {
	for index, track := range s.tracks {
		if track.ID == trackID {
			return index, true
		}
	}

	return -1, false
}

func inBetweenMinMaxIncluded(i, min, max int) bool {
	if (i >= min) && (i <= max) {
		return true
	} else {
		return false
	}
}

func (s *TrackMetadataSet) GivenIndexFitTracksRange(index int) bool {
	indexMax := len(s.tracks) - 1
	indexMin := 0

	return inBetweenMinMaxIncluded(index, indexMin, indexMax)
}

func (s *TrackMetadataSet) Swap(srcIndex, destIndex int) error {
	srcIndexIsInRange := s.GivenIndexFitTracksRange(srcIndex)
	destIndexIsInRange := s.GivenIndexFitTracksRange(destIndex)

	if !srcIndexIsInRange {
		return errors.New("srcIndexIsInRange is not in tracks set range")
	}

	if !destIndexIsInRange {
		return errors.New("destIndexIsInRange is not in tracks set range")
	}

	s.tracks[srcIndex], s.tracks[destIndex] = s.tracks[destIndex], s.tracks[srcIndex]

	return nil
}
