import { MtvWorkflowState } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import { createModel as createTestModel } from '@xstate/test';
import { addHours } from 'date-fns';
import { datatype, name, random } from 'faker';
import React from 'react';
import { ContextFrom, EventFrom, State } from 'xstate';
import { createModel } from 'xstate/lib/model';
import * as z from 'zod';
import { formatDateTime } from '../hooks/useFormatDateTime';
import { requestForegroundPermissionsAsyncMocked } from '../jest.setup';
import { MtvRoomMinimumVotesForATrackToBePlayed } from '../machines/creationMtvRoomForm';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { db } from '../tests/data';
import {
    fireEvent,
    noop,
    render,
    waitFor,
    waitForElementToBeRemoved,
    waitForTimeout,
    within,
} from '../tests/tests-utils';

const createMtvRoomWithSettingsModel = createModel(
    {
        roomName: '',
        isPublic: false,
        onlyInvitedUsersCanVote: false,
        hasPhysicalConstraints: false,
        physicalConstraintsValues: undefined as
            | undefined
            | SetPhysicalConstraintsValuesEvent,
        playingMode: 'BROADCAST' as 'BROADCAST' | 'DIRECT',
        minimumVotesConstraint: 1 as MtvRoomMinimumVotesForATrackToBePlayed,
    },
    {
        events: {
            GO_TO_SEARCH_TRACKS: () => ({}),

            TYPE_SEARCH_TRACK_QUERY_AND_SUBMIT: () => ({}),

            PRESS_SEARCH_TRACK_QUERY_RESULT: () => ({}),

            SET_ROOM_NAME_AND_GO_NEXT: (roomName: string) => ({
                value: roomName,
            }),

            SET_OPENING_STATUS: (isOpen: boolean) => ({ isOpen }),

            SET_ONLY_INVITED_USERS_CAN_VOTE: () => ({}),

            SET_PHYSICAL_CONSTRAINTS_STATUS: (
                hasPhysicalConstraints: boolean,
            ) => ({ hasPhysicalConstraints }),

            SET_PHYSICAL_CONSTRAINTS_VALUES_AND_GO_NEXT: (
                args: SetPhysicalConstraintsValuesEvent,
            ) => args,

            SET_PLAYING_MODE_STATUS: (status: 'BROADCAST' | 'DIRECT') => ({
                status,
            }),

            SET_MINIMUM_VOTES_CONSTRAINT: (
                constraint: MtvRoomMinimumVotesForATrackToBePlayed,
            ) => ({
                constraint,
            }),

            GO_BACK: () => ({}),

            GO_NEXT: () => ({}),
        },
    },
);

const assignOpeningStatus = createMtvRoomWithSettingsModel.assign(
    {
        isPublic: (_, { isOpen }) => isOpen,
    },
    'SET_OPENING_STATUS',
);

const assignPhysicalConstraintsStatus = createMtvRoomWithSettingsModel.assign(
    {
        hasPhysicalConstraints: (_, { hasPhysicalConstraints }) =>
            hasPhysicalConstraints,
    },
    'SET_PHYSICAL_CONSTRAINTS_STATUS',
);

const assignPhysicalConstraintsValues = createMtvRoomWithSettingsModel.assign(
    {
        physicalConstraintsValues: (_, values) => values,
    },
    'SET_PHYSICAL_CONSTRAINTS_VALUES_AND_GO_NEXT',
);

const assignPlayingModeStatus = createMtvRoomWithSettingsModel.assign(
    {
        playingMode: (_, { status }) => status,
    },
    'SET_PLAYING_MODE_STATUS',
);

const assignMinimumVotesConstraint = createMtvRoomWithSettingsModel.assign(
    {
        minimumVotesConstraint: (_, { constraint }) => constraint,
    },
    'SET_MINIMUM_VOTES_CONSTRAINT',
);

type CreateMtvRoomWithSettingsMachineContext = ContextFrom<
    typeof createMtvRoomWithSettingsModel
>;
type CreateMtvRoomWithSettingsMachineEvent = EventFrom<
    typeof createMtvRoomWithSettingsModel
>;
type CreateMtvRoomWithSettingsMachineState = State<
    CreateMtvRoomWithSettingsMachineContext,
    CreateMtvRoomWithSettingsMachineEvent
>;

const createMtvRoomWithSettingsMachine =
    createMtvRoomWithSettingsModel.createMachine({
        id: 'createMtvRoomWithSettings',

        initial: 'home',

        states: {
            home: {
                meta: {
                    test: ({ screen }: TestingContext) => {
                        expect(
                            screen.getAllByText(/home/i).length,
                        ).toBeGreaterThanOrEqual(1);
                    },
                },

                on: {
                    GO_TO_SEARCH_TRACKS: {
                        target: 'searchTracks',
                    },
                },
            },

            searchTracks: {
                meta: {
                    test: async ({ screen }: TestingContext) => {
                        await waitFor(() =>
                            expect(
                                screen.getByText(/search.*track/i),
                            ).toBeTruthy(),
                        );
                    },
                },

                on: {
                    TYPE_SEARCH_TRACK_QUERY_AND_SUBMIT: {
                        target: 'searchTracksResults',
                    },
                },
            },

            searchTracksResults: {
                meta: {
                    test: async ({ screen, fakeTrack }: TestingContext) => {
                        await waitFor(() =>
                            expect(screen.getByText(/results/i)).toBeTruthy(),
                        );

                        const trackResultListItem = await screen.findByText(
                            fakeTrack.title,
                        );
                        expect(trackResultListItem).toBeTruthy();
                    },
                },

                on: {
                    PRESS_SEARCH_TRACK_QUERY_RESULT: {
                        target: 'roomName',
                    },
                },
            },

            roomName: {
                meta: {
                    test: async ({ screen }: TestingContext) => {
                        const roomNameScreenTitle = await screen.findByText(
                            /what.*is.*name.*room/i,
                        );
                        expect(roomNameScreenTitle).toBeTruthy();
                    },
                },

                on: {
                    GO_BACK: {
                        target: 'home',
                    },

                    SET_ROOM_NAME_AND_GO_NEXT: [
                        {
                            cond: (_context, { value }) => {
                                const isEmptyRoomName = value === '';
                                const isNotEmptyRoomName = !isEmptyRoomName;

                                return isNotEmptyRoomName;
                            },

                            target: 'openingStatus',

                            actions: createMtvRoomWithSettingsModel.assign({
                                roomName: (_, { value }) => value,
                            }),
                        },
                    ],
                },
            },

            openingStatus: {
                initial: 'isPublic',

                states: {
                    isPublic: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedOpeningStatusOption =
                                    selectedElementsOnScreen[1];
                                expect(
                                    selectedOpeningStatusOption,
                                ).toHaveTextContent(/public/i);

                                const votingConstraintTitle = screen.getByText(
                                    /allow.*only.*invited.*users.*vote/i,
                                );
                                expect(votingConstraintTitle).toBeTruthy();

                                const votingSwitch = screen.getByRole('switch');
                                expect(votingSwitch).toBeTruthy();
                            },
                        },

                        initial: 'hasNoVotingConstraint',

                        states: {
                            hasNoVotingConstraint: {
                                meta: {
                                    test: ({ screen }: TestingContext) => {
                                        const votingSwitch =
                                            screen.getByRole('switch');

                                        expect(votingSwitch).toHaveProp(
                                            'value',
                                            false,
                                        );
                                    },
                                },
                            },

                            hasVotingConstraint: {
                                meta: {
                                    test: ({ screen }: TestingContext) => {
                                        const votingSwitch =
                                            screen.getByRole('switch');

                                        expect(votingSwitch).toHaveProp(
                                            'value',
                                            true,
                                        );
                                    },
                                },
                            },
                        },

                        on: {
                            SET_ONLY_INVITED_USERS_CAN_VOTE: {
                                target: '.hasVotingConstraint',
                            },
                        },
                    },

                    isPrivate: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedOpeningStatusOption =
                                    selectedElementsOnScreen[1];
                                expect(
                                    selectedOpeningStatusOption,
                                ).toHaveTextContent(/private/i);

                                const unknownVotingConstraintSwitch =
                                    screen.queryByRole('switch');
                                expect(
                                    unknownVotingConstraintSwitch,
                                ).toBeNull();
                            },
                        },
                    },
                },

                meta: {
                    test: async ({ screen }: TestingContext) => {
                        const openingStatusScreenTitle =
                            await screen.findByText(
                                /what.*is.*opening.*status.*room/i,
                            );
                        expect(openingStatusScreenTitle).toBeTruthy();
                    },
                },

                on: {
                    SET_OPENING_STATUS: [
                        {
                            cond: (_context, { isOpen }) => isOpen === true,

                            target: '.isPublic',

                            actions: assignOpeningStatus,
                        },

                        {
                            target: '.isPrivate',

                            actions: assignOpeningStatus,
                        },
                    ],

                    GO_NEXT: {
                        target: 'physicalConstraints',
                    },
                },
            },

            physicalConstraints: {
                meta: {
                    test: async ({ screen }: TestingContext) => {
                        const physicalConstraintsScreenTitle =
                            await screen.findByText(
                                /want.*restrict.*voting.*physical.*constraints/i,
                            );
                        expect(physicalConstraintsScreenTitle).toBeTruthy();
                    },
                },

                initial: 'hasNoPhysicalConstraints',

                states: {
                    hasNoPhysicalConstraints: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedPhysicalConstraintsStatusOption =
                                    selectedElementsOnScreen[1];
                                expect(
                                    selectedPhysicalConstraintsStatusOption,
                                ).toHaveTextContent(/^no.*restriction$/i);
                            },
                        },

                        on: {
                            GO_NEXT: {
                                target: '#playingMode',
                            },
                        },
                    },

                    hasPhysicalConstraints: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedPhysicalConstraintsStatusOption =
                                    selectedElementsOnScreen[1];
                                expect(
                                    selectedPhysicalConstraintsStatusOption,
                                ).toHaveTextContent(/^restrict$/i);
                            },
                        },

                        on: {
                            SET_PHYSICAL_CONSTRAINTS_VALUES_AND_GO_NEXT: {
                                target: '#playingMode',

                                actions: assignPhysicalConstraintsValues,
                            },
                        },
                    },
                },

                on: {
                    SET_PHYSICAL_CONSTRAINTS_STATUS: [
                        {
                            cond: (_context, { hasPhysicalConstraints }) =>
                                hasPhysicalConstraints === true,

                            target: '.hasPhysicalConstraints',

                            actions: assignPhysicalConstraintsStatus,
                        },

                        {
                            target: '.hasNoPhysicalConstraints',

                            actions: assignPhysicalConstraintsStatus,
                        },
                    ],
                },
            },

            playingMode: {
                id: 'playingMode',

                meta: {
                    test: async ({ screen }: TestingContext) => {
                        const playingModeScreenTitle = await screen.findByText(
                            /which.*playing.*mode/i,
                        );
                        expect(playingModeScreenTitle).toBeTruthy();
                    },
                },

                initial: 'broadcast',

                states: {
                    broadcast: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedPlayingModeStatusOption =
                                    selectedElementsOnScreen[1];
                                expect(
                                    selectedPlayingModeStatusOption,
                                ).toHaveTextContent(/^broadcast$/i);
                            },
                        },
                    },

                    direct: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedPlayingModeStatusOption =
                                    selectedElementsOnScreen[1];
                                expect(
                                    selectedPlayingModeStatusOption,
                                ).toHaveTextContent(/^direct$/i);
                            },
                        },
                    },
                },

                on: {
                    SET_PLAYING_MODE_STATUS: [
                        {
                            cond: (_context, { status }) =>
                                status === 'BROADCAST',

                            target: '.broadcast',

                            actions: assignPlayingModeStatus,
                        },

                        {
                            cond: (_context, { status }) => status === 'DIRECT',

                            target: '.direct',

                            actions: assignPlayingModeStatus,
                        },
                    ],

                    GO_NEXT: {
                        target: 'votesConstraints',
                    },
                },
            },

            votesConstraints: {
                meta: {
                    test: async ({ screen }: TestingContext) => {
                        const votesConstraitsScreenTitle =
                            await screen.findByText(
                                /how.*many.*votes.*song.*played/i,
                            );
                        expect(votesConstraitsScreenTitle).toBeTruthy();
                    },
                },

                initial: 'small',

                states: {
                    small: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedVotingConstraintOption =
                                    selectedElementsOnScreen[2];
                                expect(
                                    selectedVotingConstraintOption,
                                ).toHaveTextContent(/1/i);
                            },
                        },
                    },

                    medium: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedVotingConstraintOption =
                                    selectedElementsOnScreen[2];
                                expect(
                                    selectedVotingConstraintOption,
                                ).toHaveTextContent(/10/i);
                            },
                        },
                    },

                    large: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedVotingConstraintOption =
                                    selectedElementsOnScreen[2];
                                expect(
                                    selectedVotingConstraintOption,
                                ).toHaveTextContent(/50/i);
                            },
                        },
                    },
                },

                on: {
                    SET_MINIMUM_VOTES_CONSTRAINT: [
                        {
                            cond: (_context, { constraint }) =>
                                constraint === 1,

                            target: '.small',

                            actions: assignMinimumVotesConstraint,
                        },

                        {
                            cond: (_context, { constraint }) =>
                                constraint === 10,

                            target: '.medium',

                            actions: assignMinimumVotesConstraint,
                        },

                        {
                            cond: (_context, { constraint }) =>
                                constraint === 50,

                            target: '.large',

                            actions: assignMinimumVotesConstraint,
                        },
                    ],

                    GO_NEXT: {
                        target: 'confirmation',
                    },
                },
            },

            confirmation: {
                meta: {
                    test: async (
                        { screen: rootScreen }: TestingContext,
                        state: CreateMtvRoomWithSettingsMachineState,
                    ) => {
                        const {
                            roomName,
                            isPublic,
                            onlyInvitedUsersCanVote,
                            hasPhysicalConstraints,
                            physicalConstraintsValues,
                            playingMode,
                            minimumVotesConstraint,
                        } = state.context;
                        const screen = within(
                            await rootScreen.findByTestId(
                                'mtv-room-creation-confirmation-step',
                            ),
                        );

                        const confirmationScreenTitle = screen.getByText(
                            /confirm.*room.*creation/i,
                        );
                        expect(confirmationScreenTitle).toBeTruthy();

                        expect(screen.getByText(/name.*room/i)).toBeTruthy();
                        expect(screen.getByText(roomName)).toBeTruthy();

                        expect(
                            screen.getByText(/opening.*status.*room/i),
                        ).toBeTruthy();
                        switch (isPublic) {
                            case true: {
                                expect(
                                    screen.getByText(/public/i),
                                ).toBeTruthy();

                                expect(
                                    screen.getByText(
                                        /only.*invited.*users.*vote/i,
                                    ),
                                ).toBeTruthy();

                                switch (onlyInvitedUsersCanVote) {
                                    case true: {
                                        expect(
                                            screen.getAllByText(/yes/i).length,
                                        ).toBeGreaterThan(0);

                                        break;
                                    }

                                    case false: {
                                        expect(
                                            screen.getAllByText(/no/i).length,
                                        ).toBeGreaterThan(0);

                                        break;
                                    }

                                    default: {
                                        throw new Error(
                                            'Reached unreachable state',
                                        );
                                    }
                                }

                                break;
                            }

                            case false: {
                                expect(
                                    screen.getByText(/private/i),
                                ).toBeTruthy();

                                break;
                            }

                            default: {
                                throw new Error('Reached unreachable state');
                            }
                        }

                        expect(
                            screen.getByText(/has.*physical.*constraints/i),
                        ).toBeTruthy();
                        switch (hasPhysicalConstraints) {
                            case true: {
                                if (physicalConstraintsValues === undefined) {
                                    throw new Error(
                                        'physicalConstraintsValues is undefined',
                                    );
                                }
                                const { place, radius, startsAt, endsAt } =
                                    physicalConstraintsValues;
                                const startsAtFormatted = formatDateTime(
                                    new Date(startsAt),
                                );
                                const endsAtFormatted = formatDateTime(
                                    new Date(endsAt),
                                );

                                expect(
                                    screen.getAllByText(/yes/i).length,
                                ).toBeGreaterThan(0);

                                expect(screen.getByText(place)).toBeTruthy();
                                expect(
                                    screen.getByText(String(radius)),
                                ).toBeTruthy();
                                expect(
                                    screen.getByText(startsAtFormatted),
                                ).toBeTruthy();
                                expect(
                                    screen.getByText(endsAtFormatted),
                                ).toBeTruthy();

                                break;
                            }

                            case false: {
                                expect(
                                    screen.getAllByText(/no/i).length,
                                ).toBeGreaterThan(0);

                                break;
                            }

                            default: {
                                throw new Error('Reached unreachable state');
                            }
                        }

                        expect(screen.getByText(/playing.*mode/i)).toBeTruthy();
                        expect(screen.getByText(playingMode)).toBeTruthy();

                        expect(
                            screen.getByText(/minimum.*score/i),
                        ).toBeTruthy();
                        expect(
                            screen.getByText(String(minimumVotesConstraint)),
                        ).toBeTruthy();
                    },
                },

                on: {
                    GO_NEXT: {
                        target: 'createdRoom',
                    },
                },
            },

            createdRoom: {
                type: 'final',

                meta: {
                    test: async (
                        { screen, fakeTrack, getRoomState }: TestingContext,
                        state: CreateMtvRoomWithSettingsMachineState,
                    ) => {
                        const confirmationStepScreenTitle = screen.queryByText(
                            /confirm.*room.*creation/i,
                        );

                        expect(confirmationStepScreenTitle).toBeNull();

                        const musicPlayerMini =
                            screen.getByTestId('music-player-mini');
                        expect(musicPlayerMini).toBeTruthy();

                        const miniPlayerRoomName = await within(
                            musicPlayerMini,
                        ).findByText(state.context.roomName);
                        expect(miniPlayerRoomName).toBeTruthy();

                        const miniPlayerPlayButton =
                            within(musicPlayerMini).getByLabelText(
                                /play.*video/i,
                            );
                        expect(miniPlayerPlayButton).toBeTruthy();
                        expect(miniPlayerPlayButton).toBeDisabled();

                        fireEvent.press(miniPlayerRoomName);

                        const musicPlayerFullScreen =
                            await screen.findByA11yState({
                                expanded: true,
                            });
                        expect(musicPlayerFullScreen).toBeTruthy();

                        const playButton = within(
                            musicPlayerFullScreen,
                        ).getByLabelText(/play.*video/i);
                        expect(playButton).toBeTruthy();
                        expect(playButton).toBeDisabled();

                        serverSocket.emit(
                            'CREATE_ROOM_CALLBACK',
                            getRoomState(),
                        );
                        await waitForTimeout(100);
                        if (
                            state.context.hasPhysicalConstraints &&
                            state.context.physicalConstraintsValues
                        ) {
                            expect(
                                requestForegroundPermissionsAsyncMocked,
                            ).toBeCalledTimes(1);
                        } else {
                            expect(
                                requestForegroundPermissionsAsyncMocked,
                            ).toBeCalledTimes(0);
                        }

                        fireEvent.press(playButton);
                        await waitForTimeout(1_000);

                        expect(
                            await within(musicPlayerFullScreen).findByText(
                                fakeTrack.title,
                            ),
                        ).toBeTruthy();

                        const pauseButton = await within(
                            musicPlayerFullScreen,
                        ).findByLabelText(/pause.*video/i);
                        expect(pauseButton).toBeTruthy();
                        expect(pauseButton).toBeEnabled();

                        const nonZeroCurrentTime = within(
                            musicPlayerFullScreen,
                        ).getByLabelText(/elapsed/i);
                        expect(nonZeroCurrentTime).toBeTruthy();
                        expect(nonZeroCurrentTime).not.toHaveTextContent(
                            '00:00',
                        );

                        const durationTime = within(
                            musicPlayerFullScreen,
                        ).getByLabelText(/.*minutes duration/i);
                        expect(durationTime).toBeTruthy();
                        expect(durationTime).not.toHaveTextContent('00:00');
                    },
                },
            },
        },
    });

interface TestingContext {
    screen: ReturnType<typeof render>;

    fakeTrack: ReturnType<typeof db.searchableTracks.create>;
    getRoomState: () => MtvWorkflowState;
}

const TypeRoomNameEvent = z
    .object({
        value: z.string(),
    })
    .nonstrict();
type TypeRoomNameEvent = z.infer<typeof TypeRoomNameEvent>;

const SetOpeningStatusEvent = z
    .object({
        isOpen: z.boolean(),
    })
    .nonstrict();
type SetOpeningStatusEvent = z.infer<typeof SetOpeningStatusEvent>;

const SetPhysicalConstraintsStatusEvent = z
    .object({
        hasPhysicalConstraints: z.boolean(),
    })
    .nonstrict();
type SetPhysicalConstraintsStatusEvent = z.infer<
    typeof SetPhysicalConstraintsStatusEvent
>;

const SetPhysicalConstraintsValuesEvent = z
    .object({
        place: z.string(),
        radius: z.number(),
        startsAt: z.string(),
        endsAt: z.string(),
    })
    .nonstrict();
type SetPhysicalConstraintsValuesEvent = z.infer<
    typeof SetPhysicalConstraintsValuesEvent
>;

const SetPlayingModeStatusEvent = z
    .object({
        status: z.enum(['BROADCAST', 'DIRECT']),
    })
    .nonstrict();
type SetPlayingModeStatusEvent = z.infer<typeof SetPlayingModeStatusEvent>;

const SetVotingConstraintEvent = z
    .object({
        constraint: MtvRoomMinimumVotesForATrackToBePlayed,
    })
    .nonstrict();
type SetVotingConstraintEvent = z.infer<typeof SetVotingConstraintEvent>;

const createMtvRoomWithSettingsTestModel = createTestModel<
    TestingContext,
    ContextFrom<typeof createMtvRoomWithSettingsMachine>
>(createMtvRoomWithSettingsMachine).withEvents({
    GO_TO_SEARCH_TRACKS: ({ screen }) => {
        const searchScreenLink = screen.getByText(/search/i);

        fireEvent.press(searchScreenLink);
    },

    TYPE_SEARCH_TRACK_QUERY_AND_SUBMIT: ({ screen, fakeTrack }) => {
        const searchInput = screen.getByPlaceholderText(/search.*track/i);

        const SEARCH_QUERY = fakeTrack.title.slice(0, 3);

        /**
         * To simulate a real interaction with a text input, we need to:
         * 1. Focus it
         * 2. Change its text
         * 3. Submit the changes
         */
        fireEvent(searchInput, 'focus');
        fireEvent.changeText(searchInput, SEARCH_QUERY);
        fireEvent(searchInput, 'submitEditing');
    },

    PRESS_SEARCH_TRACK_QUERY_RESULT: async ({ screen, fakeTrack }) => {
        const trackResultListItem = await screen.findByText(fakeTrack.title);

        fireEvent.press(trackResultListItem);
    },

    SET_ROOM_NAME_AND_GO_NEXT: {
        exec: async ({ screen }, event) => {
            const { value: roomNameToType } = TypeRoomNameEvent.parse(event);
            const roomNameInput = await screen.findByPlaceholderText(
                /francis.*cabrel.*onlyfans/i,
            );

            fireEvent.changeText(roomNameInput, roomNameToType);

            const goNextButtons = screen.getAllByText(/next/i);
            const goNextButton = goNextButtons[goNextButtons.length - 1];

            fireEvent.press(goNextButton);
        },

        cases: [
            {
                value: 'Biolay Fans',
            } as TypeRoomNameEvent,
        ],
    },

    SET_OPENING_STATUS: {
        exec: ({ screen }, event) => {
            const { isOpen } = SetOpeningStatusEvent.parse(event);

            switch (isOpen) {
                case true: {
                    const publicButton = screen.getByText(/public/i);

                    fireEvent.press(publicButton);

                    break;
                }

                case false: {
                    const privateButton = screen.getByText(/private/i);

                    fireEvent.press(privateButton);

                    break;
                }

                default:
                    throw new Error('Reached unreachable state');
            }
        },

        cases: [
            {
                isOpen: true,
            } as SetOpeningStatusEvent,

            {
                isOpen: false,
            } as SetOpeningStatusEvent,
        ],
    },

    SET_ONLY_INVITED_USERS_CAN_VOTE: ({ screen }) => {
        const votingSwitch = screen.getByRole('switch');

        fireEvent(votingSwitch, 'valueChange', true);
    },

    SET_PHYSICAL_CONSTRAINTS_STATUS: {
        exec: ({ screen }, event) => {
            const { hasPhysicalConstraints } =
                SetPhysicalConstraintsStatusEvent.parse(event);

            switch (hasPhysicalConstraints) {
                case true: {
                    const hasPhysicalConstraintsButton =
                        screen.getByText(/^restrict$/i);

                    fireEvent.press(hasPhysicalConstraintsButton);

                    break;
                }

                case false: {
                    const hasNoPhysicalConstraintsButton =
                        screen.getByText(/^no.*restriction$/i);

                    fireEvent.press(hasNoPhysicalConstraintsButton);

                    break;
                }

                default: {
                    throw new Error('Reached unreachable state');
                }
            }
        },

        cases: [
            {
                hasPhysicalConstraints: true,
            } as SetPhysicalConstraintsStatusEvent,

            {
                hasPhysicalConstraints: false,
            } as SetPhysicalConstraintsStatusEvent,
        ],
    },

    SET_PHYSICAL_CONSTRAINTS_VALUES_AND_GO_NEXT: {
        exec: async ({ screen }, event) => {
            const { place, radius, startsAt, endsAt } =
                SetPhysicalConstraintsValuesEvent.parse(event);

            const placeInput = await screen.findByPlaceholderText(/place/i);
            fireEvent(placeInput, 'focus');
            fireEvent.changeText(placeInput, place);
            const placeSuggestion = await screen.findByText(place);
            fireEvent.press(placeSuggestion);

            const radiusPicker = screen.getByTestId('ios_picker');
            fireEvent(radiusPicker, 'valueChange', radius, 0);

            const startsAtInput = screen.getByText(/starts.*at/i);
            fireEvent.press(startsAtInput);
            const startsAtDateTimePicker = screen.getByTestId(
                'starts-at-datetime-picker',
            );
            fireEvent(
                startsAtDateTimePicker,
                'change',
                { nativeEvent: { timestamp: new Date(startsAt) } },
                new Date(startsAt),
            );
            const startsAtDateTimePickerConfirmButton =
                screen.getByA11yLabel(/confirm/i);
            fireEvent.press(startsAtDateTimePickerConfirmButton);

            await waitForElementToBeRemoved(() =>
                screen.getByTestId('starts-at-datetime-picker'),
            );

            const endsAtInput = screen.getByText(/ends.*at/i);
            fireEvent.press(endsAtInput);
            const endsAtDateTimePicker = screen.getByTestId(
                'ends-at-datetime-picker',
            );
            fireEvent(
                endsAtDateTimePicker,
                'change',
                { nativeEvent: { timestamp: new Date(endsAt) } },
                new Date(endsAt),
            );
            const endsAtDateTimePickerConfirmButton =
                screen.getByA11yLabel(/confirm/i);
            fireEvent.press(endsAtDateTimePickerConfirmButton);

            const goNextButtons = screen.getAllByText(/next/i);
            const goNextButton = goNextButtons[goNextButtons.length - 1];

            fireEvent.press(goNextButton);
        },

        cases: [
            {
                place: '96 Boulevard Bessières, Paris',
                radius: 30,
                startsAt: new Date().toISOString(),
                endsAt: addHours(new Date(), 2).toISOString(),
            } as SetPhysicalConstraintsValuesEvent,
        ],
    },

    SET_PLAYING_MODE_STATUS: {
        exec: ({ screen }, event) => {
            const { status } = SetPlayingModeStatusEvent.parse(event);

            switch (status) {
                case 'BROADCAST': {
                    const broadcastPlayingModeButton =
                        screen.getByText(/^broadcast$/i);

                    fireEvent.press(broadcastPlayingModeButton);

                    break;
                }

                case 'DIRECT': {
                    const directPlayingModeButton =
                        screen.getByText(/^direct$/i);

                    fireEvent.press(directPlayingModeButton);

                    break;
                }

                default: {
                    throw new Error('Reached unreachable state');
                }
            }
        },

        cases: [
            {
                status: 'BROADCAST',
            } as SetPlayingModeStatusEvent,

            {
                status: 'DIRECT',
            } as SetPlayingModeStatusEvent,
        ],
    },

    SET_MINIMUM_VOTES_CONSTRAINT: {
        exec: ({ screen }, event) => {
            const { constraint } = SetVotingConstraintEvent.parse(event);

            switch (constraint) {
                case 1: {
                    const smallVotingConstraintButton =
                        screen.getByText(/^1$/i);

                    fireEvent.press(smallVotingConstraintButton);

                    break;
                }

                case 10: {
                    const mediumVotingConstraintButton =
                        screen.getByText(/^10$/i);

                    fireEvent.press(mediumVotingConstraintButton);

                    break;
                }

                case 50: {
                    const largeVotingConstraintButton =
                        screen.getByText(/^50$/i);

                    fireEvent.press(largeVotingConstraintButton);

                    break;
                }

                default: {
                    throw new Error('Reached unreachable state');
                }
            }
        },

        cases: [
            {
                constraint: 1,
            } as SetVotingConstraintEvent,

            {
                constraint: 10,
            } as SetVotingConstraintEvent,

            {
                constraint: 50,
            } as SetVotingConstraintEvent,
        ],
    },

    GO_BACK: ({ screen }) => {
        const goBackButton = screen.getByText(/back/i);

        fireEvent.press(goBackButton);
    },

    GO_NEXT: ({ screen }) => {
        // All previous screen remain in memory.
        // We need to keep the next button of the last shown screen.
        const goNextButtons = screen.getAllByText(/next/i);
        const goNextButton = goNextButtons[goNextButtons.length - 1];

        fireEvent.press(goNextButton);
    },
});

describe('Create mtv room with custom settings', () => {
    const testPlans = createMtvRoomWithSettingsTestModel.getShortestPathPlans();

    afterEach(() => {
        requestForegroundPermissionsAsyncMocked.mockClear();
    });

    testPlans.forEach((plan) => {
        describe(plan.description, () => {
            plan.paths.forEach((path) => {
                it(path.description, async () => {
                    const fakeTrack = db.searchableTracks.create();
                    const userID = datatype.uuid();
                    let state: MtvWorkflowState = {
                        roomID: datatype.uuid(),
                        name: 'TEMPORARY ROOM NAME',
                        playing: false,
                        playingMode: 'BROADCAST',
                        usersLength: 1,
                        isOpen: true,
                        isOpenOnlyInvitedUsersCanVote: false,
                        hasTimeAndPositionConstraints: false,
                        timeConstraintIsValid: null,
                        userRelatedInformation: {
                            userFitsPositionConstraint: null,
                            emittingDeviceID: datatype.uuid(),
                            userID,
                            tracksVotedFor: [],
                        },
                        roomCreatorUserID: userID,
                        currentTrack: {
                            artistName: random.word(),
                            id: datatype.uuid(),
                            duration: 158000,
                            elapsed: 0,
                            title: fakeTrack.title,
                            score: datatype.number(),
                        },
                        tracks: [
                            {
                                id: datatype.uuid(),
                                artistName: name.findName(),
                                duration: 42000,
                                title: random.words(3),
                                score: datatype.number(),
                            },
                        ],
                        minimumScoreToBePlayed: 1,
                    };

                    serverSocket.on('CREATE_ROOM', (roomArgs) => {
                        const {
                            initialTracksIDs,
                            hasPhysicalAndTimeConstraints,
                            ...formatedRoomArgs
                        } = roomArgs;

                        state = {
                            ...state,
                            hasTimeAndPositionConstraints:
                                hasPhysicalAndTimeConstraints,
                            ...formatedRoomArgs,
                        };

                        serverSocket.emit('CREATE_ROOM_SYNCHED_CALLBACK', {
                            ...state,
                            tracks: null,
                            currentTrack: null,
                        });
                    });

                    serverSocket.on('ACTION_PAUSE', () => {
                        serverSocket.emit('ACTION_PAUSE_CALLBACK');
                    });

                    serverSocket.on('ACTION_PLAY', () => {
                        serverSocket.emit('ACTION_PLAY_CALLBACK', state);
                    });

                    const screen = render(
                        <NavigationContainer
                            ref={navigationRef}
                            onReady={() => {
                                isReadyRef.current = true;
                            }}
                        >
                            <RootNavigator
                                colorScheme="dark"
                                toggleColorScheme={noop}
                            />
                        </NavigationContainer>,
                    );

                    await path.test({
                        fakeTrack,
                        screen,
                        getRoomState: () => state,
                    });
                });
            });
        });
    });

    it('should have full coverage', () => {
        createMtvRoomWithSettingsTestModel.testCoverage();
    });
});
