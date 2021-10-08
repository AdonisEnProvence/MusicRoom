package shared

import (
	"sort"
	"time"
)

type MtvRoomTimerExpiredReason string

const (
	MtvRoomTimerExpiredReasonCanceled  MtvRoomTimerExpiredReason = "canceled"
	MtvRoomTimerExpiredReasonFinished  MtvRoomTimerExpiredReason = "finished"
	CheckForVoteUpdateIntervalDuration time.Duration             = 2000 * time.Millisecond
)

type MtvRoomTimer struct {
	Duration  time.Duration
	Cancel    func()
	CreatedOn time.Time
}

const ControlTaskQueue = "CONTROL_TASK_QUEUE"

var (
	SignalChannelName    = "control"
	MtvGetStateQuery     = "getState"
	MtvGetUsersListQuery = "getUsersList"
	NoRelatedUserID      = ""
)

type TrackMetadata struct {
	ID         string        `json:"id"`
	Title      string        `json:"title"`
	ArtistName string        `json:"artistName"`
	Duration   time.Duration `json:"duration"`
}

type TrackMetadataWithScore struct {
	TrackMetadata

	Score int `json:"score"`
}

func (t TrackMetadataWithScore) WithMillisecondsDuration() TrackMetadataWithScoreWithDuration {
	return TrackMetadataWithScoreWithDuration{
		TrackMetadataWithScore: t,

		Duration: t.Duration.Milliseconds(),
	}
}

type TracksMetadataWithScoreSet struct {
	tracks []TrackMetadataWithScore
}

func (s *TracksMetadataWithScoreSet) Clear() {
	s.tracks = []TrackMetadataWithScore{}
}

func (s *TracksMetadataWithScoreSet) Len() int {
	return len(s.tracks)
}

func (s *TracksMetadataWithScoreSet) Has(trackID string) bool {
	for _, track := range s.tracks {
		if track.ID == trackID {
			return true
		}
	}

	return false
}

func (s *TracksMetadataWithScoreSet) IndexOf(trackID string) (int, bool) {
	for index, track := range s.tracks {
		if track.ID == trackID {
			return index, true
		}
	}

	return -1, false
}

func (s *TracksMetadataWithScoreSet) Get(trackID string) (*TrackMetadataWithScore, bool) {
	index, exists := s.IndexOf(trackID)

	if !exists {
		return nil, false
	}

	return &s.tracks[index], true
}

func (s *TracksMetadataWithScoreSet) IncrementTrackScoreAndSortTracks(trackID string) bool {
	track, exists := s.Get(trackID)

	if !exists {
		return false
	}

	track.Score++
	s.StableSortByHigherScore()

	return true
}

func (s *TracksMetadataWithScoreSet) GetByIndex(index int) *TrackMetadataWithScore {
	tracksLength := s.Len()

	if tracksLength <= index {
		return nil
	}

	return &s.Values()[index]
}

func (s *TracksMetadataWithScoreSet) FirstTrackIsReadyToBePlayed(minimumScoreToBePlayed int) bool {

	firstTrack := s.GetByIndex(0)

	if firstTrack == nil {
		return false
	}

	return firstTrack.Score >= minimumScoreToBePlayed
}

func (s *TracksMetadataWithScoreSet) StableSortByHigherScore() {
	sort.SliceStable(s.tracks, func(i, j int) bool { return s.tracks[i].Score > s.tracks[j].Score })
}

func (s *TracksMetadataWithScoreSet) Add(track TrackMetadataWithScore) bool {
	if isDuplicate := s.Has(track.ID); isDuplicate {
		return false
	}

	s.tracks = append(s.tracks, track)
	return true
}

func (s *TracksMetadataWithScoreSet) Delete(trackID string) bool {
	for index, track := range s.tracks {
		if isMatching := track.ID == trackID; isMatching {
			s.tracks = append(s.tracks[:index], s.tracks[index+1:]...)

			return true
		}
	}

	return false
}

func (s *TracksMetadataWithScoreSet) Values() []TrackMetadataWithScore {
	return s.tracks[:]
}

// Shift removes the first element from the set and returns it as well as true.
// If the set was empty, it returns an empty TrackMetadataWithScore and false.
func (s *TracksMetadataWithScoreSet) Shift() (TrackMetadataWithScore, bool) {
	tracksCount := s.Len()
	if noElement := tracksCount == 0; noElement {
		return TrackMetadataWithScore{}, false
	}

	firstElement := s.tracks[0]

	if tracksCount == 1 {
		s.Clear()
	} else {
		s.tracks = s.tracks[1:]
	}

	return firstElement, true
}

func (s *TracksMetadataWithScoreSet) DeepEqual(toCmpTracksList TracksMetadataWithScoreSet) bool {
	if len(s.tracks) != len(toCmpTracksList.tracks) {
		return false
	}

	for index, track := range s.tracks {
		if track != toCmpTracksList.tracks[index] {
			return false
		}
	}
	return true
}

type TrackMetadataWithScoreWithDuration struct {
	TrackMetadataWithScore

	Duration int64 `json:"duration"`
}

type CurrentTrack struct {
	TrackMetadataWithScore

	AlreadyElapsed time.Duration `json:"-"`
}

type ExposedCurrentTrack struct {
	CurrentTrack

	Duration int64 `json:"duration"`
	Elapsed  int64 `json:"elapsed"`
}

func (c CurrentTrack) Export(elapsed time.Duration) ExposedCurrentTrack {
	copy := c
	copy.AlreadyElapsed = 0
	return ExposedCurrentTrack{
		CurrentTrack: copy,
		Duration:     c.Duration.Milliseconds(),
		Elapsed:      elapsed.Milliseconds(),
	}
}

type InternalStateUser struct {
	UserID                            string   `json:"userID"`
	DeviceID                          string   `json:"emittingDeviceID"`
	TracksVotedFor                    []string `json:"tracksVotedFor"`
	UserFitsPositionConstraint        *bool    `json:"userFitsPositionConstraint"`
	HasControlAndDelegationPermission bool     `json:"hasControlAndDelegationPermission"`
}

type ExposedInternalStateUserListElement struct {
	UserID                            string `json:"userID"`
	HasControlAndDelegationPermission bool   `json:"hasControlAndDelegationPermission"`
	IsCreator                         bool   `json:"isCreator"`
	IsDelegationOwner                 bool   `json:"isDelegationOwner"`
}

func (s *InternalStateUser) HasVotedFor(trackID string) bool {
	for _, votedFortrackID := range s.TracksVotedFor {
		if votedFortrackID == trackID {
			return true
		}
	}
	return false
}

type MtvRoomCoords struct {
	Lat float32 `json:"lat" validate:"required"`
	Lng float32 `json:"lng" validate:"required"`
}

type MtvRoomPhysicalAndTimeConstraints struct {
	//Adonis will manage the position process, but to keep a kind of unity
	//We would like to store in the params the constraints event if they won't
	//be used ( for now ? )
	PhysicalConstraintPosition MtvRoomCoords `json:"physicalConstraintPosition" validate:"required"`
	PhysicalConstraintRadius   int           `json:"physicalConstraintRadius" validate:"required"`
	PhysicalConstraintStartsAt time.Time     `json:"physicalConstraintStartsAt" validate:"required"`
	PhysicalConstraintEndsAt   time.Time     `json:"physicalConstraintEndsAt" validate:"required"`
}

type MtvPlayingModes string

func (m MtvPlayingModes) IsValid() bool {
	for _, mode := range MtvPlayingModesAllValues {
		if mode == m {
			return true
		}
	}

	return false
}

const (
	MtvPlayingModeDirect    MtvPlayingModes = "DIRECT"
	MtvPlayingModeBroadcast MtvPlayingModes = "BROADCAST"
)

var MtvPlayingModesAllValues = [...]MtvPlayingModes{MtvPlayingModeDirect, MtvPlayingModeBroadcast}

type MtvRoomParameters struct {
	RoomID                 string
	RoomCreatorUserID      string
	RoomName               string
	MinimumScoreToBePlayed int
	InitialUsers           map[string]*InternalStateUser
	InitialTracksIDsList   []string

	//Same as for PhysicalConstraintPosition IsOpen won't be usefull
	//for temporal itself but for the adonis mtv room search engine
	IsOpen                        bool
	IsOpenOnlyInvitedUsersCanVote bool
	HasPhysicalAndTimeConstraints bool
	PhysicalAndTimeConstraints    *MtvRoomPhysicalAndTimeConstraints
	PlayingMode                   MtvPlayingModes
}

func (p MtvRoomParameters) Export() MtvRoomExposedState {
	exposedState := MtvRoomExposedState{
		RoomID:                            p.RoomID,
		Playing:                           false,
		RoomCreatorUserID:                 p.RoomCreatorUserID,
		RoomName:                          p.RoomName,
		UserRelatedInformation:            p.InitialUsers[p.RoomCreatorUserID],
		MinimumScoreToBePlayed:            p.MinimumScoreToBePlayed,
		PlayingMode:                       p.PlayingMode,
		IsOpen:                            p.IsOpen,
		IsOpenOnlyInvitedUsersCanVotes:    p.IsOpenOnlyInvitedUsersCanVote,
		RoomHasTimeAndPositionConstraints: p.HasPhysicalAndTimeConstraints,
		DelegationOwnerUserID:             nil,
	}
	if p.PlayingMode == MtvPlayingModeDirect {
		exposedState.DelegationOwnerUserID = &p.RoomCreatorUserID
	}

	return exposedState
}

type MtvRoomExposedState struct {
	RoomID                            string                               `json:"roomID"`
	RoomCreatorUserID                 string                               `json:"roomCreatorUserID"`
	Playing                           bool                                 `json:"playing"`
	RoomName                          string                               `json:"name"`
	UserRelatedInformation            *InternalStateUser                   `json:"userRelatedInformation"`
	CurrentTrack                      *ExposedCurrentTrack                 `json:"currentTrack"`
	Tracks                            []TrackMetadataWithScoreWithDuration `json:"tracks"`
	MinimumScoreToBePlayed            int                                  `json:"minimumScoreToBePlayed"`
	UsersLength                       int                                  `json:"usersLength"`
	RoomHasTimeAndPositionConstraints bool                                 `json:"hasTimeAndPositionConstraints"`
	IsOpen                            bool                                 `json:"isOpen"`
	IsOpenOnlyInvitedUsersCanVotes    bool                                 `json:"isOpenOnlyInvitedUsersCanVote"`
	TimeConstraintIsValid             *bool                                `json:"timeConstraintIsValid"`
	PlayingMode                       MtvPlayingModes                      `json:"playingMode"`
	DelegationOwnerUserID             *string                              `json:"delegationOwnerUserID"`
}

type SignalRoute string

const (
	SignalRoutePlay                            = "play"
	SignalRoutePause                           = "pause"
	SignalRouteJoin                            = "join"
	SignalRouteLeave                           = "leave"
	SignalRouteTerminate                       = "terminate"
	SignalRouteGoToNextTrack                   = "go-to-next-track"
	SignalRouteChangeUserEmittingDevice        = "change-user-emitting-device"
	SignalRouteSuggestTracks                   = "suggest-tracks"
	SignalRouteVoteForTrack                    = "vote-for-track"
	SignalUpdateUserFitsPositionConstraint     = "update-user-fits-position-constraint"
	SignalUpdateDelegationOwner                = "update-delegation-owner"
	SignalUpdateControlAndDelegationPermission = "update-control-and-delegation-permision"
)

type GenericRouteSignal struct {
	Route SignalRoute
}

type PlaySignal struct {
	Route  SignalRoute `validate:"required"`
	UserID string      `validate:"required,uuid"`
}

type NewPlaySignalArgs struct {
	UserID string `validate:"required,uuid"`
}

func NewPlaySignal(args NewPlaySignalArgs) PlaySignal {
	return PlaySignal{
		Route:  SignalRoutePlay,
		UserID: args.UserID,
	}
}

type PauseSignal struct {
	Route  SignalRoute `validate:"required"`
	UserID string      `validate:"required,uuid"`
}

type NewPauseSignalArgs struct {
	UserID string `validate:"required,uuid"`
}

func NewPauseSignal(args NewPauseSignalArgs) PauseSignal {
	return PauseSignal{
		Route:  SignalRoutePause,
		UserID: args.UserID,
	}
}

type LeaveSignal struct {
	Route  SignalRoute `validate:"required"`
	UserID string      `validate:"required,uuid"`
}

type NewLeaveSignalArgs struct {
	UserID string
}

func NewLeaveSignal(args NewLeaveSignalArgs) JoinSignal {
	return JoinSignal{
		Route:  SignalRouteLeave,
		UserID: args.UserID,
	}
}

type JoinSignal struct {
	Route    SignalRoute `validate:"required"`
	UserID   string      `validate:"required,uuid"`
	DeviceID string      `validate:"required,uuid"`
}

type NewJoinSignalArgs struct {
	UserID   string
	DeviceID string
}

func NewJoinSignal(args NewJoinSignalArgs) JoinSignal {
	return JoinSignal{
		Route:    SignalRouteJoin,
		UserID:   args.UserID,
		DeviceID: args.DeviceID,
	}
}

type TerminateSignal struct {
	Route SignalRoute
}

type NewTerminateSignalArgs struct{}

func NewTerminateSignal(args NewTerminateSignalArgs) TerminateSignal {
	return TerminateSignal{
		Route: SignalRouteTerminate,
	}
}

type GoToNextTrackSignal struct {
	Route  SignalRoute `validate:"required"`
	UserID string      `validate:"required,uuid"`
}

type NewGoToNextTrackSignalArgs struct {
	UserID string `validate:"required,uuid"`
}

func NewGoToNexTrackSignal(args NewGoToNextTrackSignalArgs) GoToNextTrackSignal {
	return GoToNextTrackSignal{
		Route:  SignalRouteGoToNextTrack,
		UserID: args.UserID,
	}
}

type ChangeUserEmittingDeviceSignal struct {
	Route    SignalRoute `validate:"required"`
	UserID   string      `validate:"required,uuid"`
	DeviceID string      `validate:"required,uuid"`
}

type ChangeUserEmittingDeviceSignalArgs struct {
	UserID   string
	DeviceID string
}

func NewChangeUserEmittingDeviceSignal(args ChangeUserEmittingDeviceSignalArgs) ChangeUserEmittingDeviceSignal {
	return ChangeUserEmittingDeviceSignal{
		Route:    SignalRouteChangeUserEmittingDevice,
		UserID:   args.UserID,
		DeviceID: args.DeviceID,
	}
}

type SuggestTracksSignal struct {
	Route           SignalRoute `validate:"required"`
	TracksToSuggest []string    `validate:"required,dive,required"`
	UserID          string      `validate:"required,uuid"`
	DeviceID        string      `validate:"required,uuid"`
}

type SuggestTracksSignalArgs struct {
	TracksToSuggest []string
	UserID          string
	DeviceID        string
}

func NewSuggestTracksSignal(args SuggestTracksSignalArgs) SuggestTracksSignal {
	return SuggestTracksSignal{
		Route:           SignalRouteSuggestTracks,
		TracksToSuggest: args.TracksToSuggest,
		UserID:          args.UserID,
		DeviceID:        args.DeviceID,
	}
}

type VoteForTrackSignal struct {
	Route   SignalRoute `validate:"required"`
	UserID  string      `validate:"required,uuid"`
	TrackID string      `validate:"required"`
}

type NewVoteForTrackSignalArgs struct {
	UserID  string `validate:"required,uuid"`
	TrackID string `validate:"required"`
}

func NewVoteForTrackSignal(args NewVoteForTrackSignalArgs) VoteForTrackSignal {
	return VoteForTrackSignal{
		Route:   SignalRouteVoteForTrack,
		TrackID: args.TrackID,
		UserID:  args.UserID,
	}
}

type UpdateUserFitsPositionConstraintSignal struct {
	Route                      SignalRoute `validate:"required"`
	UserID                     string      `validate:"required,uuid"`
	UserFitsPositionConstraint bool
}

type NewUpdateUserFitsPositionConstraintSignalArgs struct {
	UserID                     string `validate:"required,uuid"`
	UserFitsPositionConstraint bool
}

func NewUpdateUserFitsPositionConstraintSignal(args NewUpdateUserFitsPositionConstraintSignalArgs) UpdateUserFitsPositionConstraintSignal {
	return UpdateUserFitsPositionConstraintSignal{
		Route:                      SignalUpdateUserFitsPositionConstraint,
		UserID:                     args.UserID,
		UserFitsPositionConstraint: args.UserFitsPositionConstraint,
	}
}

type UpdateDelegationOwnerSignal struct {
	Route                    SignalRoute `validate:"required"`
	NewDelegationOwnerUserID string      `validate:"required,uuid"`
	EmitterUserID            string      `validate:"required,uuid"`
}

type NewUpdateDelegationOwnerSignalArgs struct {
	NewDelegationOwnerUserID string `validate:"required,uuid"`
	EmitterUserID            string `validate:"required,uuid"`
}

func NewUpdateDelegationOwnerSignal(args NewUpdateDelegationOwnerSignalArgs) UpdateDelegationOwnerSignal {
	return UpdateDelegationOwnerSignal{
		Route:                    SignalUpdateDelegationOwner,
		NewDelegationOwnerUserID: args.NewDelegationOwnerUserID,
		EmitterUserID:            args.EmitterUserID,
	}
}

type UpdateControlAndDelegationPermissionSignal struct {
	Route                             SignalRoute `validate:"required"`
	ToUpdateUserID                    string      `validate:"required,uuid"`
	HasControlAndDelegationPermission bool
}

type NewUpdateControlAndDelegationPermissionSignalArgs struct {
	ToUpdateUserID                    string
	HasControlAndDelegationPermission bool
}

func NewUpdateControlAndDelegationPermissionSignal(args NewUpdateControlAndDelegationPermissionSignalArgs) UpdateControlAndDelegationPermissionSignal {
	return UpdateControlAndDelegationPermissionSignal{
		Route:                             SignalUpdateControlAndDelegationPermission,
		ToUpdateUserID:                    args.ToUpdateUserID,
		HasControlAndDelegationPermission: args.HasControlAndDelegationPermission,
	}
}
