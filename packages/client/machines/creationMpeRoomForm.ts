import { TrackMetadata } from '@musicroom/types';
import invariant from 'tiny-invariant';
import { ActorRefFrom, ContextFrom, EventFrom, StateMachine } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { navigateFromRef } from '../navigation/RootNavigation';
import { fetchTracksByID } from '../services/search-tracks';
import { MusicPlaylistEditorCreationFormParamList } from '../types';

const creationMpeRoomFormModel = createModel(
    {
        initialTracksMetadata: undefined as TrackMetadata[] | undefined,

        roomName: '',
        isOpen: false,
        onlyInvitedUsersCanVote: false,
    },
    {
        events: {
            SET_ROOM_NAME_AND_GO_NEXT: (args: { roomName: string }) => args,
            SET_OPENING_STATUS: (args: { isOpen: boolean }) => args,
            SET_INVITED_USERS_VOTE_RESTRICTION: (args: {
                onlyInvitedUsersCanVote: boolean;
            }) => args,
            RECEIVED_INITIAL_TRACKS_METADATA: (args: {
                tracksMetadata: TrackMetadata[];
            }) => args,
            NEXT: () => ({}),
            GO_BACK: () => ({}),
        },

        actions: {
            redirectToScreen: (args: {
                screen: keyof MusicPlaylistEditorCreationFormParamList;
            }) => args,

            assignIsOpenToContext: (args: { isOpen: boolean }) => args,
        },
    },
);

const assignRoomNameToContext = creationMpeRoomFormModel.assign(
    {
        roomName: (_, event) => event.roomName,
    },
    'SET_ROOM_NAME_AND_GO_NEXT',
);

const resetOnlyInvitedUsersCanVote = creationMpeRoomFormModel.assign({
    onlyInvitedUsersCanVote: false,
});

const assignOnlyInvitedUsersCanVoteToContext = creationMpeRoomFormModel.assign(
    {
        onlyInvitedUsersCanVote: (_context, { onlyInvitedUsersCanVote }) =>
            onlyInvitedUsersCanVote,
    },
    'SET_INVITED_USERS_VOTE_RESTRICTION',
);

const assignInitialTracksMetadataToContext = creationMpeRoomFormModel.assign(
    {
        initialTracksMetadata: (_, event) => event.tracksMetadata,
    },
    'RECEIVED_INITIAL_TRACKS_METADATA',
);

export type CreationMpeRoomFormMachine = StateMachine<
    ContextFrom<typeof creationMpeRoomFormModel>,
    any,
    EventFrom<typeof creationMpeRoomFormModel>
>;
export type CreationMpeRoomFormActorRef = ActorRefFrom<
    typeof createCreationMpeRoomFormMachine
>;

interface CreateCreationMpeRoomFormMachineArgs {
    initialTracksIDs: string[];
}

export function createCreationMpeRoomFormMachine({
    initialTracksIDs,
}: CreateCreationMpeRoomFormMachineArgs): CreationMpeRoomFormMachine {
    return creationMpeRoomFormModel.createMachine(
        {
            id: 'creationMpeRoomForm',

            initial: 'roomName',

            states: {
                roomName: {
                    entry: creationMpeRoomFormModel.actions.redirectToScreen({
                        screen: 'MusicPlaylistEditorCreationFormName',
                    }),

                    on: {
                        SET_ROOM_NAME_AND_GO_NEXT: {
                            target: 'openingStatus',

                            actions: assignRoomNameToContext,
                        },
                    },
                },

                openingStatus: {
                    entry: creationMpeRoomFormModel.actions.redirectToScreen({
                        screen: 'MusicPlaylistEditorCreationFormOpeningStatus',
                    }),

                    initial: 'public',

                    states: {
                        public: {
                            tags: 'isRoomPublic',

                            entry: [
                                creationMpeRoomFormModel.actions.assignIsOpenToContext(
                                    {
                                        isOpen: true,
                                    },
                                ),
                                resetOnlyInvitedUsersCanVote,
                            ],

                            on: {
                                SET_INVITED_USERS_VOTE_RESTRICTION: {
                                    actions:
                                        assignOnlyInvitedUsersCanVoteToContext,
                                },
                            },
                        },

                        private: {
                            tags: 'isRoomPrivate',

                            entry: creationMpeRoomFormModel.actions.assignIsOpenToContext(
                                {
                                    isOpen: false,
                                },
                            ),
                        },
                    },

                    on: {
                        SET_OPENING_STATUS: [
                            {
                                cond: (_context, { isOpen }) => isOpen === true,

                                target: '.public',
                            },

                            {
                                target: '.private',
                            },
                        ],

                        NEXT: {
                            target: 'confirmation',
                        },

                        GO_BACK: {
                            target: 'roomName',
                        },
                    },
                },

                confirmation: {
                    entry: creationMpeRoomFormModel.actions.redirectToScreen({
                        screen: 'MusicPlaylistEditorCreationFormConfirmation',
                    }),

                    initial: 'fetchingInitialTracksInformation',

                    states: {
                        fetchingInitialTracksInformation: {
                            invoke: {
                                src: 'fetchTracksInformation',
                            },

                            on: {
                                RECEIVED_INITIAL_TRACKS_METADATA: {
                                    target: 'debouncing',

                                    actions:
                                        assignInitialTracksMetadataToContext,
                                },
                            },
                        },

                        debouncing: {
                            after: {
                                1000: {
                                    target: 'fetchedInitialTracksInformation',
                                },
                            },
                        },

                        fetchedInitialTracksInformation: {
                            tags: 'hasFetchedInitialTracksInformation',
                        },
                    },

                    on: {
                        GO_BACK: {
                            target: 'openingStatus',
                        },

                        NEXT: {
                            target: 'confirmed',
                        },
                    },
                },

                confirmed: {
                    type: 'final',

                    data: (context) => context,
                },
            },
        },
        {
            actions: {
                redirectToScreen: (_context, _event, meta) => {
                    navigateFromRef(meta.action.screen);
                },

                assignIsOpenToContext: creationMpeRoomFormModel.assign(
                    {
                        isOpen: (_context, _event, meta) => meta.action.isOpen,
                    },
                    undefined,
                ),
            },

            services: {
                fetchTracksInformation: () => async (sendBack) => {
                    try {
                        const tracksMetadata = await fetchTracksByID(
                            initialTracksIDs,
                        );
                        invariant(
                            tracksMetadata !== undefined,
                            'Could not fetch tracks metadata',
                        );

                        sendBack({
                            type: 'RECEIVED_INITIAL_TRACKS_METADATA',
                            tracksMetadata,
                        });
                    } catch (err) {
                        console.error(err);
                    }
                },
            },
        },
    );
}
