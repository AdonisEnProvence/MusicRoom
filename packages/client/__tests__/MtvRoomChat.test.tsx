import { MtvWorkflowState, UserDevice } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import { datatype, name, random, lorem } from 'faker';
import React from 'react';
import { createModel } from 'xstate/lib/model';
import { createModel as createTestingModel } from '@xstate/test';
import * as z from 'zod';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { fireEvent, render, within, noop } from '../tests/tests-utils';
import { ContextFrom, EventFrom, State } from 'xstate';

interface TestingContext {
    screen: ReturnType<typeof render>;
    musicPlayerFullScreen: any;
}

const mtvRoomChatModel = createModel(
    {
        message: undefined as string | undefined,
    },
    {
        events: {
            TYPE_MESSAGE_AND_SUBMIT: (message: string) => ({ message }),

            TYPE_MESSAGE_AND_CLICK_ON_SEND: (message: string) => ({ message }),
        },
    },
);

type MtvRoomChatMachineState = State<
    ContextFrom<typeof mtvRoomChatModel>,
    EventFrom<typeof mtvRoomChatModel>
>;

const assignMessageFromSubmission = mtvRoomChatModel.assign(
    {
        message: (_, { message }) => message,
    },
    'TYPE_MESSAGE_AND_SUBMIT',
);

const assignMessageFromClickingOnSend = mtvRoomChatModel.assign(
    {
        message: (_, { message }) => message,
    },
    'TYPE_MESSAGE_AND_CLICK_ON_SEND',
);

function isMessageEmpty(message: string): boolean {
    return message === '';
}

const mtvRoomChatMachine = mtvRoomChatModel.createMachine({
    context: mtvRoomChatModel.initialContext,

    initial: 'chatView',

    states: {
        chatView: {
            meta: {
                test: async ({ musicPlayerFullScreen }: TestingContext) => {
                    /**
                     * Toggle Devices tab
                     * And Search for listed user devices
                     */

                    const goToChatTabButton = within(
                        musicPlayerFullScreen,
                    ).getByText(/chat/i);
                    expect(goToChatTabButton).toBeTruthy();

                    fireEvent.press(goToChatTabButton);

                    const chatTextInput = await within(
                        musicPlayerFullScreen,
                    ).findByPlaceholderText(/write.*message/i);
                    expect(chatTextInput).toBeTruthy();
                },
            },

            on: {
                TYPE_MESSAGE_AND_SUBMIT: [
                    {
                        cond: (_, { message }) => isMessageEmpty(message),

                        target: 'messageHasBeenRejected',

                        actions: assignMessageFromSubmission,
                    },

                    {
                        target: 'messageHasBeenAdded',

                        actions: assignMessageFromSubmission,
                    },
                ],

                TYPE_MESSAGE_AND_CLICK_ON_SEND: [
                    {
                        cond: (_, { message }) => isMessageEmpty(message),

                        target: 'messageHasBeenRejected',

                        actions: assignMessageFromClickingOnSend,
                    },

                    {
                        target: 'messageHasBeenAdded',

                        actions: assignMessageFromClickingOnSend,
                    },
                ],
            },
        },

        messageHasBeenAdded: {
            meta: {
                test: async (
                    { musicPlayerFullScreen }: TestingContext,
                    { context: { message } }: MtvRoomChatMachineState,
                ) => {
                    if (message === undefined) {
                        throw new Error('message from context must be defined');
                    }

                    const addedMessage = await within(
                        musicPlayerFullScreen,
                    ).findByText(message);

                    expect(addedMessage).toBeTruthy();
                },
            },
        },

        messageHasBeenRejected: {
            meta: {
                test: async (
                    { musicPlayerFullScreen }: TestingContext,
                    { context: { message } }: MtvRoomChatMachineState,
                ) => {
                    if (message === undefined) {
                        throw new Error('message from context must be defined');
                    }

                    const messageThatShouldHaveNotBeenAdded = await within(
                        musicPlayerFullScreen,
                    ).queryByText(message);

                    expect(messageThatShouldHaveNotBeenAdded).toBeNull();
                },
            },
        },
    },
});

const TypeMessageAndSubmitEvent = z
    .object({
        message: z.string(),
    })
    .nonstrict();
type TypeMessageAndSubmitEvent = z.infer<typeof TypeMessageAndSubmitEvent>;

const TypeMessageAndClickOnSendEvent = z
    .object({
        message: z.string(),
    })
    .nonstrict();
type TypeMessageAndClickOnSendEvent = z.infer<
    typeof TypeMessageAndClickOnSendEvent
>;

const mtvRoomChatTestingModel = createTestingModel<TestingContext>(
    mtvRoomChatMachine,
).withEvents({
    TYPE_MESSAGE_AND_SUBMIT: {
        exec: async ({ musicPlayerFullScreen }, event) => {
            try {
                const { message } = TypeMessageAndSubmitEvent.parse(event);

                const chatTextInput = await within(
                    musicPlayerFullScreen,
                ).findByPlaceholderText(/write.*message/i);
                expect(chatTextInput).toBeTruthy();

                fireEvent.changeText(chatTextInput, message);
                fireEvent(chatTextInput, 'submitEditing');
            } catch (err) {
                console.error(err);

                throw err;
            }
        },

        cases: [
            {
                message: '',
            },

            {
                message: lorem.sentences(),
            },
        ] as TypeMessageAndSubmitEvent[],
    },

    TYPE_MESSAGE_AND_CLICK_ON_SEND: {
        exec: async ({ musicPlayerFullScreen }, event) => {
            try {
                const { message } = TypeMessageAndClickOnSendEvent.parse(event);

                const chatTextInput = await within(
                    musicPlayerFullScreen,
                ).findByPlaceholderText(/write.*message/i);
                expect(chatTextInput).toBeTruthy();

                fireEvent.changeText(chatTextInput, message);

                const submitButton = within(
                    musicPlayerFullScreen,
                ).getByA11yLabel(/send.*message/i);

                fireEvent.press(submitButton);
            } catch (err) {
                console.error(err);

                throw err;
            }
        },

        cases: [
            {
                message: '',
            },

            {
                message: lorem.sentences(),
            },
        ] as TypeMessageAndClickOnSendEvent[],
    },
});

describe('Send and receive messages in MTV room chat', () => {
    const testPlans = mtvRoomChatTestingModel.getSimplePathPlans();

    testPlans.forEach((plan) => {
        describe(plan.description, () => {
            plan.paths.forEach((path) => {
                it(path.description, async () => {
                    const userID = datatype.uuid();
                    const initialState: MtvWorkflowState = {
                        roomID: datatype.uuid(),
                        name: random.word(),
                        playing: false,
                        usersLength: 1,
                        playingMode: 'BROADCAST',
                        isOpen: true,
                        isOpenOnlyInvitedUsersCanVote: false,
                        hasTimeAndPositionConstraints: false,
                        timeConstraintIsValid: null,
                        delegationOwnerUserID: null,
                        userRelatedInformation: {
                            hasControlAndDelegationPermission: true,
                            userFitsPositionConstraint: null,
                            emittingDeviceID: datatype.uuid(),
                            userID,
                            tracksVotedFor: [],
                        },
                        currentTrack: null,
                        roomCreatorUserID: userID,
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

                    serverSocket.on('GET_CONTEXT', () => {
                        serverSocket.emit('RETRIEVE_CONTEXT', initialState);
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

                    const musicPlayerMini =
                        screen.getByTestId('music-player-mini');
                    expect(musicPlayerMini).toBeTruthy();

                    fireEvent.press(musicPlayerMini);

                    const musicPlayerFullScreen = await screen.findByA11yState({
                        expanded: true,
                    });
                    expect(musicPlayerFullScreen).toBeTruthy();

                    await path.test({
                        screen,
                        musicPlayerFullScreen,
                    });
                });
            });
        });
    });

    it('should have full coverage', () => {
        mtvRoomChatTestingModel.testCoverage();
    });
});
