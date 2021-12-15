import {
    MAX_CHAT_MESSAGE_LENGTH,
    MtvRoomChatMessage,
    MtvWorkflowState,
} from '@musicroom/types';
import { createModel as createTestingModel } from '@xstate/test';
import { datatype, lorem, name, random } from 'faker';
import { ContextFrom, EventFrom, State } from 'xstate';
import { createModel } from 'xstate/lib/model';
import * as z from 'zod';
import { serverSocket } from '../services/websockets';
import { fireEvent, render, renderApp, within } from '../tests/tests-utils';

interface TestingContext {
    screen: ReturnType<typeof render>;
    chatScreen: unknown;
}

const mtvRoomChatModel = createModel(
    {
        message: undefined as string | undefined,
    },
    {
        events: {
            TYPE_MESSAGE_AND_SUBMIT: (message: string) => ({ message }),

            TYPE_MESSAGE_AND_CLICK_ON_SEND: (message: string) => ({ message }),

            RECEIVE_MESSAGE_FROM_OTHER_USER: (message: MtvRoomChatMessage) => ({
                message,
            }),
        },
    },
);

type MtvRoomChatMachineState = State<
    ContextFrom<typeof mtvRoomChatModel>,
    EventFrom<typeof mtvRoomChatModel>
>;

const assignMessageFromSubmission = mtvRoomChatModel.assign(
    {
        message: (_, { message }) => normalizeMessage(message),
    },
    'TYPE_MESSAGE_AND_SUBMIT',
);

const assignMessageFromClickingOnSend = mtvRoomChatModel.assign(
    {
        message: (_, { message }) => normalizeMessage(message),
    },
    'TYPE_MESSAGE_AND_CLICK_ON_SEND',
);

const assignMessageFromServerBroadcasting = mtvRoomChatModel.assign(
    {
        message: (_, { message }) => message.text,
    },
    'RECEIVE_MESSAGE_FROM_OTHER_USER',
);

function normalizeMessage(message: string): string {
    return message.trim();
}

function isMessageEmpty(message: string): boolean {
    return message === '';
}

function isTooLongMessage(message: string): boolean {
    return message.length > MAX_CHAT_MESSAGE_LENGTH;
}

const mtvRoomChatMachine = mtvRoomChatModel.createMachine({
    context: mtvRoomChatModel.initialContext,

    initial: 'chatView',

    states: {
        chatView: {
            meta: {
                test: ({ chatScreen }: TestingContext) => {
                    /**
                     * Toggle Devices tab
                     * And Search for listed user devices
                     */

                    const screenTitle = within(chatScreen).getByText(/chat/i);
                    expect(screenTitle).toBeTruthy();
                },
            },

            on: {
                TYPE_MESSAGE_AND_SUBMIT: [
                    {
                        cond: (_, { message }) =>
                            isMessageEmpty(normalizeMessage(message)),

                        target: 'messageHasBeenRejected',

                        actions: assignMessageFromSubmission,
                    },

                    {
                        cond: (_, { message }) =>
                            isTooLongMessage(normalizeMessage(message)),

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
                        cond: (_, { message }) =>
                            isMessageEmpty(normalizeMessage(message)),

                        target: 'messageHasBeenRejected',

                        actions: assignMessageFromClickingOnSend,
                    },

                    {
                        cond: (_, { message }) =>
                            isTooLongMessage(normalizeMessage(message)),

                        target: 'messageHasBeenRejected',

                        actions: assignMessageFromClickingOnSend,
                    },

                    {
                        target: 'messageHasBeenAdded',

                        actions: assignMessageFromClickingOnSend,
                    },
                ],

                RECEIVE_MESSAGE_FROM_OTHER_USER: {
                    target: 'messageHasBeenAdded',

                    actions: assignMessageFromServerBroadcasting,
                },
            },
        },

        messageHasBeenAdded: {
            meta: {
                test: async (
                    { chatScreen }: TestingContext,
                    { context: { message } }: MtvRoomChatMachineState,
                ) => {
                    if (message === undefined) {
                        throw new Error('message from context must be defined');
                    }

                    const addedMessage = await within(chatScreen).findByText(
                        message,
                    );

                    expect(addedMessage).toBeTruthy();
                },
            },
        },

        messageHasBeenRejected: {
            meta: {
                test: async (
                    { chatScreen }: TestingContext,
                    { context: { message } }: MtvRoomChatMachineState,
                ) => {
                    if (message === undefined) {
                        throw new Error('message from context must be defined');
                    }

                    const messageThatShouldHaveNotBeenAdded = await within(
                        chatScreen,
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

const ReceiveMessageFromOtherUserEvent = z
    .object({ message: MtvRoomChatMessage })
    .nonstrict();
type ReceiveMessageFromOtherUserEvent = z.infer<
    typeof ReceiveMessageFromOtherUserEvent
>;

const mtvRoomChatTestingModel = createTestingModel<TestingContext>(
    mtvRoomChatMachine,
).withEvents({
    TYPE_MESSAGE_AND_SUBMIT: {
        exec: async ({ chatScreen }, event) => {
            try {
                const { message } = TypeMessageAndSubmitEvent.parse(event);

                const chatTextInput = await within(
                    chatScreen,
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
                message: '     ',
            },

            {
                message: `  ${lorem.sentence()}   `,
            },

            {
                message: lorem.paragraphs(10),
            },

            {
                message: lorem.sentences(),
            },
        ] as TypeMessageAndSubmitEvent[],
    },

    TYPE_MESSAGE_AND_CLICK_ON_SEND: {
        exec: async ({ chatScreen }, event) => {
            try {
                const { message } = TypeMessageAndClickOnSendEvent.parse(event);

                const chatTextInput = await within(
                    chatScreen,
                ).findByPlaceholderText(/write.*message/i);
                expect(chatTextInput).toBeTruthy();

                fireEvent.changeText(chatTextInput, message);

                const submitButton =
                    within(chatScreen).getByA11yLabel(/send.*message/i);

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
                message: '     ',
            },

            {
                message: `  ${lorem.sentence()}   `,
            },

            {
                message: lorem.paragraphs(10),
            },

            {
                message: lorem.sentences(),
            },
        ] as TypeMessageAndClickOnSendEvent[],
    },

    RECEIVE_MESSAGE_FROM_OTHER_USER: {
        exec: ({ screen }, event) => {
            try {
                const { message } =
                    ReceiveMessageFromOtherUserEvent.parse(event);

                screen.serverSocket.emit('MTV_RECEIVED_MESSAGE', { message });
            } catch (err) {
                console.error(err);

                throw err;
            }
        },

        cases: [
            {
                message: {
                    id: datatype.uuid(),
                    authorID: datatype.uuid(),
                    authorName: name.title(),
                    text: lorem.sentences(),
                },
            },
        ] as ReceiveMessageFromOtherUserEvent[],
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
                            userHasBeenInvited: false,
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

                    serverSocket.on('MTV_GET_CONTEXT', () => {
                        serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
                    });

                    const screen = await renderApp();

                    const musicPlayerMini =
                        screen.getByTestId('music-player-mini');
                    expect(musicPlayerMini).toBeTruthy();

                    fireEvent.press(musicPlayerMini);

                    const musicPlayerFullScreen = await screen.findByA11yState({
                        expanded: true,
                    });
                    expect(musicPlayerFullScreen).toBeTruthy();

                    const goToChatTabButton = within(
                        musicPlayerFullScreen,
                    ).getByText(/chat/i);
                    expect(goToChatTabButton).toBeTruthy();

                    fireEvent.press(goToChatTabButton);

                    const chatScreen = await screen.findByTestId(
                        'mtv-chat-screen',
                    );
                    expect(chatScreen).toBeTruthy();

                    await path.test({
                        screen,
                        chatScreen,
                    });
                });
            });
        });
    });

    it('should have full coverage', () => {
        mtvRoomChatTestingModel.testCoverage();
    });
});
