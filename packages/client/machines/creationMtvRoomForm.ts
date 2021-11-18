import { MtvPlayingModes, TrackMetadata } from '@musicroom/types';
import {
    ActorRef,
    ContextFrom,
    DoneInvokeEvent,
    EventFrom,
    sendParent,
    StateFrom,
    StateMachine,
} from 'xstate';
import { createModel } from 'xstate/lib/model';
import * as z from 'zod';
import { navigateFromRef } from '../navigation/RootNavigation';
import { fetchTracksByID } from '../services/search-tracks';
import { CreationMtvRoomFormMachineToAppMusicPlayerMachineEvents } from './appMusicPlayerMachine';

export const MtvRoomMinimumVotesForATrackToBePlayed = z.union([
    z.literal(1),
    z.literal(2),
    z.literal(10),
]);
export type MtvRoomMinimumVotesForATrackToBePlayed = z.infer<
    typeof MtvRoomMinimumVotesForATrackToBePlayed
>;
const defaultMtvRoomMinimumVotesForATrackToBePlayed: MtvRoomMinimumVotesForATrackToBePlayed = 1;

const creationMtvRoomFormModel = createModel(
    {
        initialTracksIDs: [] as string[],
        initialTracksMetadata: undefined as TrackMetadata[] | undefined,

        roomName: '',
        isOpen: true,
        onlyInvitedUsersCanVote: false,
        hasPhysicalConstraints: false,
        physicalConstraintPlaceID: '',
        physicalConstraintPlace: '',
        physicalConstraintRadius: 30,
        physicalConstraintStartsAt: new Date(),
        physicalConstraintEndsAt: undefined as undefined | Date,
        playingMode: 'BROADCAST' as MtvPlayingModes,
        minimumVotesForATrackToBePlayed:
            defaultMtvRoomMinimumVotesForATrackToBePlayed as MtvRoomMinimumVotesForATrackToBePlayed,
    },

    {
        events: {
            SET_ROOM_NAME_AND_GO_NEXT: (roomName: string) => ({ roomName }),

            SET_OPENING_STATUS: (isOpen: boolean) => ({ isOpen }),

            SET_INVITED_USERS_VOTE_RESTRICTION: (
                onlyInvitedUsersCanVote: boolean,
            ) => ({ onlyInvitedUsersCanVote }),

            SET_PHYSICAL_CONSTRAINTS_STATUS: (isRestricted: boolean) => ({
                isRestricted,
            }),

            SET_PHYSICAL_CONSTRAINTS_VALUES_AND_GO_NEXT: (args: {
                placeID: string;
                place: string;
                radius: number;
                startsAt: Date;
                endsAt: Date;
            }) => args,

            SET_PLAYING_MODE: (playingMode: MtvPlayingModes) => ({
                playingMode,
            }),

            SET_MINIMUM_VOTES_FOR_A_TRACK_TO_BE_PLAYED: (
                minimumVotesForATrackToBePlayed: MtvRoomMinimumVotesForATrackToBePlayed,
            ) => ({ minimumVotesForATrackToBePlayed }),

            FORWARD_MODAL_CLOSER: (closeModal: () => void) => ({ closeModal }),

            GO_BACK: () => ({}),

            NEXT: () => ({}),

            RECEIVED_INITIAL_TRACKS_METADATA: (
                tracksMetadata: TrackMetadata[],
            ) => ({ tracksMetadata }),
        },
    },
);

export const creationMtvRoomFormInitialContext =
    creationMtvRoomFormModel.initialContext;

type CreationMtvRoomFormModelEventsCreators =
    typeof creationMtvRoomFormModel.events;
type ForwardModalCloserEvent = ReturnType<
    CreationMtvRoomFormModelEventsCreators['FORWARD_MODAL_CLOSER']
>;

export type CreationMtvRoomFormMachineContext = ContextFrom<
    typeof creationMtvRoomFormModel
>;

export type CreationMtvRoomFormMachineEvent = EventFrom<
    typeof creationMtvRoomFormModel
>;

export type CreationMtvRoomFormMachine = StateMachine<
    CreationMtvRoomFormMachineContext,
    any,
    CreationMtvRoomFormMachineEvent
>;

export type CreationMtvRoomFormMachineState =
    StateFrom<CreationMtvRoomFormMachine>;

export type CreationMtvRoomFormActorRef = ActorRef<
    CreationMtvRoomFormMachineEvent,
    CreationMtvRoomFormMachineState
>;

export type CreationMtvRoomFormDoneInvokeEvent = DoneInvokeEvent<
    Omit<CreationMtvRoomFormMachineContext, 'physicalConstraintPlace'>
>;

export function createCreationMtvRoomFormMachine(): CreationMtvRoomFormMachine {
    return creationMtvRoomFormModel.createMachine(
        {
            context: creationMtvRoomFormModel.initialContext,

            initial: 'roomName',

            states: {
                roomName: {
                    entry: () => {
                        try {
                            navigateFromRef('MusicTrackVoteCreationFormName');
                        } catch {
                            // An error is thrown when the modal is open.
                            // We are not yet in MusicTrackVoteCreationForm and
                            // we can there is no screen called MusicTrackVoteCreationFormName.
                            // This is not a problem that the first call does not succeed
                            // as we already perform the redirection in openCreationMtvRoomFormModal action.
                            // It is particularly useful to handle redirection to Name step.
                        }
                    },

                    on: {
                        SET_ROOM_NAME_AND_GO_NEXT: {
                            target: 'openingStatus',

                            actions: assignRoomName,
                        },

                        FORWARD_MODAL_CLOSER: {
                            actions: sendParent<
                                CreationMtvRoomFormMachineContext,
                                ForwardModalCloserEvent,
                                CreationMtvRoomFormMachineToAppMusicPlayerMachineEvents
                            >((_context, event) => ({
                                type: 'SAVE_MTV_ROOM_CREATION_MODAL_CLOSER',
                                closeModal: event.closeModal,
                            })),
                        },

                        GO_BACK: {
                            actions: sendParent<
                                CreationMtvRoomFormMachineContext,
                                any,
                                CreationMtvRoomFormMachineToAppMusicPlayerMachineEvents
                            >({
                                type: 'EXIT_MTV_ROOM_CREATION',
                            }),
                        },
                    },
                },

                openingStatus: {
                    entry: () => {
                        navigateFromRef(
                            'MusicTrackVoteCreationFormOpeningStatus',
                        );
                    },

                    initial: 'public',

                    states: {
                        public: {
                            tags: 'isRoomPublic',

                            entry: resetOnlyInvitedUsersCanVote,

                            on: {
                                SET_INVITED_USERS_VOTE_RESTRICTION: {
                                    actions: creationMtvRoomFormModel.assign({
                                        onlyInvitedUsersCanVote: (
                                            _context,
                                            { onlyInvitedUsersCanVote },
                                        ) => onlyInvitedUsersCanVote,
                                    }),
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

                                actions: assignIsOpen,
                            },

                            {
                                target: '.private',

                                actions: assignIsOpen,
                            },
                        ],

                        GO_BACK: {
                            target: 'roomName',
                        },

                        NEXT: {
                            target: 'physicalConstraints',
                        },
                    },
                },

                physicalConstraints: {
                    entry: () => {
                        navigateFromRef(
                            'MusicTrackVoteCreationFormPhysicalConstraints',
                        );
                    },

                    initial: 'isNotRestricted',

                    states: {
                        isRestricted: {
                            tags: 'hasPhysicalConstraints',
                        },

                        isNotRestricted: {
                            tags: 'hasNoPhysicalConstraints',
                        },
                    },

                    on: {
                        SET_PHYSICAL_CONSTRAINTS_STATUS: [
                            {
                                cond: (_context, { isRestricted }) =>
                                    isRestricted === true,

                                target: '.isRestricted',

                                actions: assignHasPhysicalConstraints,
                            },

                            {
                                target: '.isNotRestricted',

                                actions: assignHasPhysicalConstraints,
                            },
                        ],

                        SET_PHYSICAL_CONSTRAINTS_VALUES_AND_GO_NEXT: {
                            target: 'playingMode',

                            actions: assignPhysicalConstraintValuesToContext,
                        },

                        GO_BACK: {
                            target: 'openingStatus',
                        },

                        NEXT: {
                            cond: ({ hasPhysicalConstraints }) =>
                                hasPhysicalConstraints === false,

                            target: 'playingMode',

                            actions: resetPhysicalConstraintValues,
                        },
                    },
                },

                playingMode: {
                    entry: () => {
                        navigateFromRef(
                            'MusicTrackVoteCreationFormPlayingMode',
                        );
                    },

                    on: {
                        SET_PLAYING_MODE: {
                            actions: assignPlayingMode,
                        },

                        GO_BACK: {
                            target: 'physicalConstraints',
                        },

                        NEXT: {
                            target: 'votesConstraints',
                        },
                    },
                },

                votesConstraints: {
                    entry: () => {
                        navigateFromRef(
                            'MusicTrackVoteCreationFormVotesConstraints',
                        );
                    },

                    on: {
                        SET_MINIMUM_VOTES_FOR_A_TRACK_TO_BE_PLAYED: {
                            actions: assignMinimumVotesForATrackToBePlayed,
                        },

                        GO_BACK: {
                            target: 'playingMode',
                        },

                        NEXT: {
                            target: 'waitingForConfirmation',
                        },
                    },
                },

                waitingForConfirmation: {
                    entry: () => {
                        navigateFromRef(
                            'MusicTrackVoteCreationFormConfirmation',
                        );
                    },

                    initial: 'fetchingInitialTracksInformation',

                    states: {
                        fetchingInitialTracksInformation: {
                            invoke: {
                                src: 'fetchTracksInformation',
                            },

                            on: {
                                RECEIVED_INITIAL_TRACKS_METADATA: {
                                    target: 'debouncing',

                                    actions: creationMtvRoomFormModel.assign({
                                        initialTracksMetadata: (_, event) =>
                                            event.tracksMetadata,
                                    }),
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
                            target: 'votesConstraints',
                        },

                        NEXT: {
                            target: 'confirmed',
                        },
                    },
                },

                confirmed: {
                    type: 'final',

                    data: (context) => {
                        const { physicalConstraintPlace, ...rest } = context;
                        return rest;
                    },
                },
            },
        },

        {
            services: {
                fetchTracksInformation: (context) => async (sendBack) => {
                    try {
                        const tracksMetadata = await fetchTracksByID(
                            context.initialTracksIDs,
                        );
                        if (tracksMetadata === undefined) {
                            throw new Error('Could not fetch tracks metadata');
                        }

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

const assignRoomName = creationMtvRoomFormModel.assign(
    {
        roomName: (_context, { roomName }) => roomName,
    },
    'SET_ROOM_NAME_AND_GO_NEXT',
);

const assignIsOpen = creationMtvRoomFormModel.assign(
    {
        isOpen: (_context, { isOpen }) => isOpen,
    },
    'SET_OPENING_STATUS',
);

const resetOnlyInvitedUsersCanVote = creationMtvRoomFormModel.assign(
    {
        onlyInvitedUsersCanVote: false,
    },
    undefined,
);

const assignHasPhysicalConstraints = creationMtvRoomFormModel.assign(
    {
        hasPhysicalConstraints: (_context, { isRestricted }) => isRestricted,
    },
    'SET_PHYSICAL_CONSTRAINTS_STATUS',
);

const assignPhysicalConstraintValuesToContext = creationMtvRoomFormModel.assign(
    {
        physicalConstraintPlaceID: (_context, { placeID }) => placeID,
        physicalConstraintPlace: (_context, { place }) => place,
        physicalConstraintRadius: (_context, { radius }) => radius,
        physicalConstraintStartsAt: (_context, { startsAt }) => startsAt,
        physicalConstraintEndsAt: (_context, { endsAt }) => endsAt,
    },
    'SET_PHYSICAL_CONSTRAINTS_VALUES_AND_GO_NEXT',
);

const resetPhysicalConstraintValues = creationMtvRoomFormModel.assign(
    {
        physicalConstraintPlaceID:
            creationMtvRoomFormInitialContext.physicalConstraintPlaceID,
        physicalConstraintPlace:
            creationMtvRoomFormInitialContext.physicalConstraintPlace,
        physicalConstraintRadius:
            creationMtvRoomFormInitialContext.physicalConstraintRadius,
        physicalConstraintStartsAt:
            creationMtvRoomFormInitialContext.physicalConstraintStartsAt,
        physicalConstraintEndsAt:
            creationMtvRoomFormInitialContext.physicalConstraintEndsAt,
    },
    'NEXT',
);

const assignPlayingMode = creationMtvRoomFormModel.assign(
    {
        playingMode: (_context, { playingMode }) => playingMode,
    },
    'SET_PLAYING_MODE',
);

const assignMinimumVotesForATrackToBePlayed = creationMtvRoomFormModel.assign(
    {
        minimumVotesForATrackToBePlayed: (
            _context,
            { minimumVotesForATrackToBePlayed },
        ) => minimumVotesForATrackToBePlayed,
    },
    'SET_MINIMUM_VOTES_FOR_A_TRACK_TO_BE_PLAYED',
);
