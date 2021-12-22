import { ActorRefFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { navigateFromRef } from '../navigation/RootNavigation';
import { MusicPlaylistEditorCreationFormParamList } from '../types';

const creationMpeRoomFormModel = createModel(
    {
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
            NEXT: () => ({}),
            GO_BACK: () => ({}),
        },

        actions: {
            redirectToScreen: (args: {
                screen: keyof MusicPlaylistEditorCreationFormParamList;
            }) => args,
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

const assignOpeningStatusToContext = creationMpeRoomFormModel.assign(
    {
        isOpen: (_, event) => event.isOpen,
    },
    'SET_OPENING_STATUS',
);

const assignOnlyInvitedUsersCanVoteToContext = creationMpeRoomFormModel.assign(
    {
        onlyInvitedUsersCanVote: (_context, { onlyInvitedUsersCanVote }) =>
            onlyInvitedUsersCanVote,
    },
    'SET_INVITED_USERS_VOTE_RESTRICTION',
);

export type CreationMpeRoomFormActorRef = ActorRefFrom<
    typeof creationMpeRoomFormMachine
>;

export const creationMpeRoomFormMachine =
    creationMpeRoomFormModel.createMachine(
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

                            entry: resetOnlyInvitedUsersCanVote,

                            on: {
                                SET_INVITED_USERS_VOTE_RESTRICTION: {
                                    actions:
                                        assignOnlyInvitedUsersCanVoteToContext,
                                },
                            },
                        },

                        private: {
                            tags: 'isRoomPrivate',
                        },
                    },

                    on: {
                        SET_OPENING_STATUS: [
                            {
                                cond: (_context, { isOpen }) => isOpen === true,

                                target: '.public',

                                actions: assignOpeningStatusToContext,
                            },

                            {
                                target: '.private',

                                actions: assignOpeningStatusToContext,
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
            },
        },
    );
