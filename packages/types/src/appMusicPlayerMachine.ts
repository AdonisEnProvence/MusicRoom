export interface AppMusicPlayerMachineContext {
    currentRoom?: TrackVoteRoom;
    currentTrack?: TrackVoteTrack;
    waitingRoomID?: string;

    currentTrackDuration: number;
    currentTrackElapsedTime: number;
}

export interface TrackVoteRoom {
    roomID: string;
    name: string;
}

export interface TrackVoteTrack {
    name: string;
    artistName: string;
}
