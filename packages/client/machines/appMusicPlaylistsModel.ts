import { createModel } from 'xstate/lib/model';
import {
    MpeWorkflowState,
    MpeRoomClientToServerCreateArgs,
    MpeRoomClientToServerChangeTrackOrderUpDownArgs,
    MpeRoomServerToClientChangeTrackFailCallbackArgs,
    MpeRoomServerToClientChangeTrackSuccessCallbackARgs,
    MpeRoomSummary,
    MpeWorkflowStateWithUserRelatedInformation,
    PlaylistModelMpeWorkflowState,
    MtvRoomCreationOptionsWithoutInitialTracksIDs,
} from '@musicroom/types';
import { ActorRefFrom, ContextFrom, EventFrom } from 'xstate';
import { PlaylistActorRef } from './playlistMachine';

export interface MusicPlaylist {
    id: string;
    roomName: string;
    ref: PlaylistActorRef;
}

export const appMusicPlaylistsModel = createModel(
    {
        playlistsActorsRefs: [] as MusicPlaylist[],

        roomToCreateInitialTracksIDs: undefined as string[] | undefined,
        currentlyDisplayedMpeRoomView: undefined as string | undefined, //MusicPlaylist ??
        currentlyExportedToMtvMpeRoomID: undefined as string | undefined,
        closeMtvRoomCreationModal: undefined as (() => void) | undefined,
    },
    {
        events: {
            OPEN_CREATION_FORM: (args: { initialTracksIDs: string[] }) => args,
            CLOSE_CREATION_FORM: () => ({}),

            CREATE_ROOM: (params: MpeRoomClientToServerCreateArgs) => ({
                params,
            }),
            ROOM_CREATION_ACKNOWLEDGEMENT: (
                state: MpeWorkflowStateWithUserRelatedInformation,
            ) => ({
                state,
            }),
            ROOM_IS_READY: (
                state: MpeWorkflowStateWithUserRelatedInformation,
            ) => ({
                state,
            }),
            JOIN_ROOM: (args: { roomID: string }) => args,
            LEAVE_ROOM: (args: { roomID: string }) => args,
            RECEIVED_FORCED_DISCONNECTION: (args: {
                roomSummary: MpeRoomSummary;
            }) => args,
            RECEIVED_MPE_LEAVE_ROOM_CALLBACK: (args: {
                roomSummary: MpeRoomSummary;
            }) => args,

            SET_CURRENTLY_DISPLAYED_MPE_ROOM_VIEW: (args: { roomID: string }) =>
                args,
            RESET_CURRENTLY_DISPLAYED_MPE_ROOM_VIEW: () => ({}),

            JOIN_ROOM_ACKNOWLEDGEMENT: (args: {
                roomID: string;
                state: MpeWorkflowStateWithUserRelatedInformation;
                userIsNotInRoom: boolean;
            }) => args,

            USERS_LENGTH_UPDATE: (args: {
                roomID: string;
                state: MpeWorkflowState;
            }) => args,

            MPE_TRACKS_LIST_UPDATE: (args: {
                state: MpeWorkflowState;
                roomID: string;
            }) => args,
            DISPLAY_MPE_ROOM_VIEW: (args: {
                roomID: string;
                roomName: string;
            }) => args,

            //Get context
            MPE_GET_CONTEXT: (args: { roomID: string }) => args,
            RECEIVED_MPE_GET_CONTEXT_SUCCESS_CALLBACK: (args: {
                state: PlaylistModelMpeWorkflowState;
                roomID: string;
                userIsNotInRoom: boolean;
            }) => args,
            RECEIVED_MPE_GET_CONTEXT_FAIL_CALLBACK: (args: {
                roomID: string;
            }) => args,
            ///

            //Add track
            ADD_TRACK: (args: { roomID: string; trackID: string }) => args,
            SENT_TRACK_TO_ADD_TO_SERVER: (args: { roomID: string }) => args,
            RECEIVED_ADD_TRACKS_SUCCESS_CALLBACK: (args: {
                roomID: string;
                state: MpeWorkflowState;
            }) => args,
            RECEIVED_ADD_TRACKS_FAIL_CALLBACK: (args: { roomID: string }) =>
                args,
            ///

            //Change track order
            CHANGE_TRACK_ORDER_DOWN: (
                args: MpeRoomClientToServerChangeTrackOrderUpDownArgs,
            ) => args,
            CHANGE_TRACK_ORDER_UP: (
                args: MpeRoomClientToServerChangeTrackOrderUpDownArgs,
            ) => args,
            SENT_CHANGE_TRACK_ORDER_TO_SERVER: (args: { roomID: string }) =>
                args,
            RECEIVED_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK: (
                args: MpeRoomServerToClientChangeTrackSuccessCallbackARgs,
            ) => args,
            RECEIVED_CHANGE_TRACK_ORDER_FAIL_CALLBACK: (
                args: MpeRoomServerToClientChangeTrackFailCallbackArgs,
            ) => args,
            ///

            STOP_AND_REMOVE_ACTOR_FROM_PLAYLIST_LIST: (args: {
                roomID: string;
            }) => args,
            DELETE_TRACK: (args: { roomID: string; trackID: string }) => args,
            SENT_TRACK_TO_DELETE_TO_SERVER: (args: { roomID: string }) => args,
            RECEIVED_DELETE_TRACKS_SUCCESS_CALLBACK: (args: {
                roomID: string;
                state: MpeWorkflowState;
            }) => args,

            SPAWN_PLAYLIST_ACTOR_FROM_STATE: (args: {
                roomID: string;
                state: MpeWorkflowStateWithUserRelatedInformation;
            }) => args,

            EXPORT_TO_MTV_ROOM: (args: { roomID: string }) => args,

            SAVE_MTV_ROOM_CREATION_MODAL_CLOSER: (args: {
                closeModal: () => void;
            }) => args,

            SEND_EXPORT_TO_MTV_ROOM_TO_SERVER: (args: {
                roomID: string;
                mtvRoomOptions: MtvRoomCreationOptionsWithoutInitialTracksIDs;
            }) => args,

            EXIT_MTV_ROOM_CREATION: () => ({}),

            //Invitation
            CREATOR_INVITE_USER_IN_ROOM: (args: {
                roomID: string;
                userID: string;
            }) => args,

            MPE_RECEIVED_ROOM_INVITATION: (args: {
                roomSummary: MpeRoomSummary;
            }) => args,

            USER_ACCEPTED_MPE_ROOM_INVITATION: (args: {
                roomSummary: MpeRoomSummary;
            }) => args,

            USER_IGNORED_MPE_ROOM_INVITATION: () => ({}),
            ///
        },

        actions: {
            openCreationMpeFormModal: () => ({}),
            redirectToMpeLibrary: () => ({}),
            goBackToLastScreen: () => ({}),
            displayMpeForcedDisconnectionToast: () => ({}),
            openMusicPlayerFullScreen: () => ({}),
        },
    },
);

export type MusicPlaylistsContext = ContextFrom<typeof appMusicPlaylistsModel>;
export type MusicPlaylistsEvents = EventFrom<typeof appMusicPlaylistsModel>;
export type AppMusicPlaylistsMachine = ReturnType<
    typeof appMusicPlaylistsModel['createMachine']
>;
export type AppMusicPlaylistsActorRef = ActorRefFrom<AppMusicPlaylistsMachine>;
