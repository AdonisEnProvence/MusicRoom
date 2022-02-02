import {
    AllClientToServerEvents,
    AllServerToClientEvents,
    MtvRoomClientToServerCreateArgs,
    MpeRoomClientToServerCreateArgs,
    MpeWorkflowState,
    TrackMetadata,
    MpeWorkflowStateWithUserRelatedInformation,
} from '@musicroom/types';
import MtvServerToTemporalController from 'App/Controllers/Http/Temporal/MtvServerToTemporalController';
import MpeRoom from 'App/Models/MpeRoom';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import { unique, datatype, random, name } from 'faker';
import sinon from 'sinon';
import { io, Socket } from 'socket.io-client';
import {
    createMachine,
    interpret,
    StateFrom,
    assign,
    DoneInvokeEvent,
} from 'xstate';

/**
 * Adapted from https://github.com/ai/nanospy/blob/main/index.js.
 * As it works only with ESM, we can not use it
 */
interface Spy {
    callCount: number;
}

interface SpyFn<Fn extends (...args: any[]) => any = (...args: any[]) => any>
    extends Spy {
    (...args: Parameters<Fn>): ReturnType<Fn>;
}

function spy<Fn extends (...args: any[]) => any = (...args: any[]) => any>(
    cb?: Fn,
): SpyFn<Fn> {
    const fn: SpyFn<Fn> = (...args) => {
        fn.callCount += 1;

        return cb?.(...args);
    };

    fn.callCount = 0;

    return fn;
}

export function waitForTimeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

export const sleep = async (): Promise<void> => await waitForTimeout(200);

type TypedTestSocket = Socket<AllServerToClientEvents, AllClientToServerEvents>;

type AvailableBrowsersMocks = 'Firefox' | 'Chrome' | 'Safari';

interface CreateUserForSocketConnectionArgs {
    userID: string;
    mtvRoomIDToAssociate?: string;
    mpeRoomIDToAssociate?: {
        roomName?: string;
        roomID: string;
        isOpen?: boolean;
    }[];
    roomName?: string;
    userNickname?: string;
}

interface CreateUserAndGetSocketArgs extends CreateUserForSocketConnectionArgs {
    deviceName?: string;
    browser?: AvailableBrowsersMocks;
}

interface CreateSocketConnectionArgs {
    userID: string;
    deviceName?: string;
    browser?: AvailableBrowsersMocks;
    requiredEventListeners?: (socket: TypedTestSocket) => void;
}

export type MtvServerToTemporalControllerLeaveWorkflowStub = sinon.SinonStub<
    Parameters<typeof MtvServerToTemporalController.leaveWorkflow>,
    ReturnType<typeof MtvServerToTemporalController.leaveWorkflow>
> & { __brand: 'leaveWorkflow' };

export const BASE_URL = `http://${process.env.HOST!}:${process.env.PORT!}`;

export const TEST_MTV_TEMPORAL_LISTENER = `/temporal/mtv`;
export const TEST_MPE_TEMPORAL_LISTENER = `/temporal/mpe`;
export const TEST_USER_ROUTES_GROUP_PREFIX = '/user';

interface TestUtilsReturnedValue {
    initSocketConnection: () => void;
    disconnectEveryRemainingSocketConnection: () => Promise<void>;
    disconnectSocket: (socket: TypedTestSocket) => Promise<void>;
    createSocketConnection: (
        args: CreateSocketConnectionArgs,
    ) => Promise<TypedTestSocket>;
    createUserAndGetSocketWithoutConnectionAcknowledgement: (
        args: CreateUserAndGetSocketArgs,
    ) => Promise<TypedTestSocket>;
    createUserAndGetSocket: (
        args: CreateUserAndGetSocketArgs,
    ) => Promise<TypedTestSocket>;
    waitFor: <ExpectReturn>(
        expect: () => ExpectReturn | Promise<ExpectReturn>,
        timeout?: number,
    ) => Promise<ExpectReturn>;
    spy: typeof spy;
}

export class AssertionTimeout extends Error {
    constructor() {
        super('Assertion timed out');
    }
}

export function initTestUtils(): TestUtilsReturnedValue {
    let socketsConnections: TypedTestSocket[] = [];
    let acknowledgeDeletingDeviceStub: sinon.SinonStub<
        [socketID: string],
        void
    >;

    function initSocketConnection() {
        socketsConnections = [];

        sinon.restore();
        sinon
            .stub(MtvServerToTemporalController, 'terminateWorkflow')
            .callsFake(async () => {
                return;
            });
        sinon
            .stub(MtvServerToTemporalController, 'leaveWorkflow')
            .callsFake(async () => {
                return;
            });
        acknowledgeDeletingDeviceStub = sinon.stub(
            SocketLifecycle,
            'acknowledgeDeletingDevice',
        );
    }

    async function waitForSocketToBeDeleted(socketID: string) {
        return await waitFor(() => {
            if (
                acknowledgeDeletingDeviceStub.calledWithExactly(socketID) ===
                false
            ) {
                throw new Error('Socket was not deleted');
            }
        });
    }

    async function disconnectEveryRemainingSocketConnection() {
        for (const socket of socketsConnections) {
            const socketID = socket.id;

            socket.disconnect();

            await waitForSocketToBeDeleted(socketID);
        }
    }

    async function disconnectSocket(socket: TypedTestSocket) {
        const socketID = socket.id;

        socket.disconnect();

        await waitForSocketToBeDeleted(socketID);

        socketsConnections = socketsConnections.filter(
            (el) => el.id !== socket.id,
        );
    }

    function createSocketConnectionWithoutAcknowledgement({
        userID,
        browser,
        deviceName,
        requiredEventListeners,
    }: CreateSocketConnectionArgs): TypedTestSocket {
        const query: Record<string, string> = {
            userID,
        };
        if (deviceName) {
            query.deviceName = deviceName;
        }

        const extraHeaders: Record<string, string> = {};
        if (browser !== undefined) {
            switch (browser) {
                case 'Chrome':
                    extraHeaders[
                        'user-agent'
                    ] = `Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.116 Safari/537.36`;
                    break;
                case 'Firefox':
                    extraHeaders[
                        'user-agent'
                    ] = `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0`;
                    break;
                case 'Safari':
                    extraHeaders[
                        'user-agent'
                    ] = `Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15`;
                    break;
            }
        }

        const socket = io(BASE_URL, {
            query,
            extraHeaders,
        });
        socketsConnections.push(socket);
        if (requiredEventListeners) requiredEventListeners(socket);

        return socket;
    }

    async function waitForSocketToBeAcknowledged(socket: TypedTestSocket) {
        const pollConnectionAcknowledgementMachine = createMachine<
            unknown,
            { type: 'CONNECTION_ACKNOWLEDGED' }
        >({
            id: 'pollConnectionAcknowledgement',

            after: {
                1_000: {
                    target: 'timedOut',
                },
            },

            initial: 'fetching',

            states: {
                fetching: {
                    after: {
                        50: {
                            target: 'deboucing',
                        },
                    },

                    invoke: {
                        id: 'fetchingAcknowledgement',

                        src: () => (sendBack) => {
                            socket.emit(
                                'GET_HAS_ACKNOWLEDGED_CONNECTION',
                                () => {
                                    sendBack({
                                        type: 'CONNECTION_ACKNOWLEDGED',
                                    });
                                },
                            );
                        },
                    },

                    on: {
                        CONNECTION_ACKNOWLEDGED: {
                            target: 'connectionIsAcknowledged',
                        },
                    },
                },

                deboucing: {
                    after: {
                        100: {
                            target: 'fetching',
                        },
                    },
                },

                connectionIsAcknowledged: {
                    type: 'final',
                },

                timedOut: {
                    type: 'final',
                },
            },
        });

        let state = pollConnectionAcknowledgementMachine.initialState;
        const service = interpret(pollConnectionAcknowledgementMachine)
            .onTransition((updatedState) => {
                state = updatedState;
            })
            .start();

        await new Promise<void>((resolve, reject) => {
            service.onDone(() => {
                if (state.matches('connectionIsAcknowledged')) {
                    resolve();

                    return;
                }

                reject(new Error('Connection has never been acknowledged'));
            });
        });
    }

    /**
     * We create a socket connection and wait for the server to acknowledge
     * its creation.
     *
     * The server sends a `CONNECTION_ACKNOWLEDGED` event when the creation is acknowledged.
     * We wait for this event to be received by the socket.
     * We use `socket.once` to do not make this function produce unexpected behaviours
     * after it ends.
     */
    async function createSocketConnection(
        args: CreateSocketConnectionArgs,
    ): Promise<TypedTestSocket> {
        const socket = createSocketConnectionWithoutAcknowledgement(args);

        await waitForSocketToBeAcknowledged(socket);

        return socket;
    }

    async function createUserForSocketConnection({
        userID,
        mtvRoomIDToAssociate,
        mpeRoomIDToAssociate,
        roomName,
        userNickname,
    }: CreateUserForSocketConnectionArgs) {
        const createdUser = await User.create({
            uuid: userID,
            nickname: userNickname ?? unique(() => random.word()),
        });

        if (mtvRoomIDToAssociate !== undefined) {
            let mtvRoomToAssociate = await MtvRoom.find(mtvRoomIDToAssociate);

            if (mtvRoomToAssociate === null) {
                mtvRoomToAssociate = await MtvRoom.create({
                    uuid: mtvRoomIDToAssociate,
                    runID: datatype.uuid(),
                    name: roomName ?? random.words(2),
                    creatorID: createdUser.uuid,
                });
            }
            await createdUser.related('mtvRoom').associate(mtvRoomToAssociate);
        }

        if (mpeRoomIDToAssociate !== undefined) {
            await Promise.all(
                mpeRoomIDToAssociate.map(
                    async ({ roomID, roomName: mpeRoomName, isOpen }) => {
                        let mpeRoomToAssociate = await MpeRoom.find(roomID);
                        if (mpeRoomToAssociate === null) {
                            console.log('CREATING MPE ROOM FROM TEST UTILS');
                            mpeRoomToAssociate = await MpeRoom.create({
                                uuid: roomID,
                                isOpen: isOpen ?? true,
                                runID: datatype.uuid(),
                                name: mpeRoomName ?? random.words(2),
                                creatorID: createdUser.uuid,
                            });
                        }
                        await createdUser
                            .related('mpeRooms')
                            .save(mpeRoomToAssociate);
                    },
                ),
            );
        }
    }

    async function createUserAndGetSocketWithoutConnectionAcknowledgement({
        userID,
        deviceName,
        browser,
        mtvRoomIDToAssociate,
        mpeRoomIDToAssociate,
        roomName,
        userNickname,
    }: CreateUserAndGetSocketArgs): Promise<TypedTestSocket> {
        await createUserForSocketConnection({
            userID,
            mtvRoomIDToAssociate,
            mpeRoomIDToAssociate,
            roomName,
            userNickname,
        });

        //No need to remoteJoin the created socket as SocketLifeCycle.registerDevice will do it for us
        const socket = createSocketConnectionWithoutAcknowledgement({
            userID,
            deviceName,
            browser,
        });

        return socket;
    }

    async function createUserAndGetSocket({
        userID,
        deviceName,
        browser,
        mtvRoomIDToAssociate,
        mpeRoomIDToAssociate,
        userNickname,
        roomName,
    }: CreateUserAndGetSocketArgs): Promise<TypedTestSocket> {
        await createUserForSocketConnection({
            userID,
            mtvRoomIDToAssociate,
            mpeRoomIDToAssociate,
            roomName,
            userNickname,
        });

        //No need to remoteJoin the created socket as SocketLifeCycle.registerDevice will do it for us
        const socket = await createSocketConnection({
            userID,
            deviceName,
            browser,
        });

        return socket;
    }

    const createWaitForMachine = <ExpectReturn>(timeout: number) =>
        createMachine(
            {
                initial: 'tryExpect',

                context: {
                    expectReturn: undefined as ExpectReturn | undefined,
                },

                after: {
                    TIMEOUT: {
                        target: 'cancelled',
                    },
                },

                states: {
                    tryExpect: {
                        initial: 'assert',

                        states: {
                            assert: {
                                invoke: {
                                    src: 'expect',

                                    onDone: {
                                        target: 'succeeded',

                                        actions: assign({
                                            expectReturn: (
                                                _,
                                                {
                                                    data,
                                                }: DoneInvokeEvent<ExpectReturn>,
                                            ) => data,
                                        }),
                                    },

                                    onError: {
                                        target: 'debouncing',
                                    },
                                },
                            },

                            debouncing: {
                                after: {
                                    10: {
                                        target: 'assert',
                                    },
                                },
                            },

                            succeeded: {
                                type: 'final',
                            },
                        },

                        onDone: {
                            target: 'succeeded',
                        },

                        on: {
                            CANCELLED: {
                                target: 'cancelled',
                            },
                        },
                    },

                    succeeded: {
                        type: 'final',
                    },

                    cancelled: {
                        type: 'final',
                    },
                },
            },
            {
                delays: {
                    TIMEOUT: timeout,
                },
            },
        );

    async function waitFor<ExpectReturn>(
        expect: () => ExpectReturn | Promise<ExpectReturn>,
        timeout?: number,
    ): Promise<ExpectReturn> {
        try {
            return await new Promise((resolve, reject) => {
                let state: StateFrom<typeof createWaitForMachine>;

                interpret(
                    createWaitForMachine(timeout ?? 200).withConfig({
                        services: {
                            expect: async () => {
                                return await expect();
                            },
                        },
                    }),
                )
                    .onTransition((updatedState) => {
                        state = updatedState;
                    })
                    .onDone(() => {
                        if (state.matches('succeeded')) {
                            resolve(state.context.expectReturn as ExpectReturn);

                            return;
                        }

                        reject(new AssertionTimeout());
                    })
                    .start();
            });
        } catch (err: unknown) {
            if (err instanceof Error) {
                // Replace err stack with the current stack minus
                // all calls after waitFor function included.
                Error.captureStackTrace(err, waitFor);

                throw err;
            }

            throw new Error('Unexpected error occured in waitFor function');
        }
    }

    return {
        createSocketConnection,
        createUserAndGetSocket,
        createUserAndGetSocketWithoutConnectionAcknowledgement,
        disconnectSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
        waitFor,
        spy,
    };
}

export function getDefaultMtvRoomCreateRoomArgs(
    override?: Partial<MtvRoomClientToServerCreateArgs>,
): MtvRoomClientToServerCreateArgs {
    if (override === undefined) {
        override = {};
    }

    const needToOverrideIsOpen = override.isOpen !== undefined;

    return {
        name: override.name ?? random.word(),
        initialTracksIDs: override.initialTracksIDs ?? [],
        hasPhysicalAndTimeConstraints:
            override.hasPhysicalAndTimeConstraints || false,
        physicalAndTimeConstraints:
            override.physicalAndTimeConstraints || undefined,
        isOpen: needToOverrideIsOpen ? (override.isOpen as boolean) : true,
        isOpenOnlyInvitedUsersCanVote:
            override.isOpenOnlyInvitedUsersCanVote || false,
        minimumScoreToBePlayed: override.minimumScoreToBePlayed ?? 1,
        playingMode: 'BROADCAST',
    };
}

export function getDefaultMpeRoomCreateRoomArgs(
    override?: Partial<MpeRoomClientToServerCreateArgs>,
): MpeRoomClientToServerCreateArgs {
    if (override === undefined) {
        override = {};
    }

    const needToOverrideIsOpen = override.isOpen !== undefined;

    return {
        initialTrackID: override.initialTrackID ?? datatype.uuid(),
        name: override.name ?? random.word(),
        isOpen: needToOverrideIsOpen ? (override.isOpen as boolean) : true,
        isOpenOnlyInvitedUsersCanEdit:
            override.isOpenOnlyInvitedUsersCanEdit || false,
    };
}

export function sortBy<Collection, Key extends keyof Collection>(
    items: Collection[],
    key: Key,
): Collection[] {
    return [...items].sort((a, b) =>
        a[key] > b[key] ? 1 : b[key] > a[key] ? -1 : 0,
    );
}

export function generateTrackMetadata(
    overrides?: Partial<TrackMetadata>,
): TrackMetadata {
    return {
        id: datatype.uuid(),
        artistName: name.title(),
        duration: 42000 as number,
        title: random.words(),

        ...overrides,
    };
}

interface GenerateArrayArgs<Item> {
    minLength: number;
    maxLength: number;
    fill: ((index: number) => Item) | (() => Item);
}

export function generateArray<Item>({
    minLength,
    maxLength,
    fill,
}: GenerateArrayArgs<Item>): Item[] {
    return Array.from({
        length: datatype.number({ min: minLength, max: maxLength }),
    }).map((_, index) => fill(index));
}

export function generateMpeWorkflowState(
    overrides?: Partial<MpeWorkflowState>,
): MpeWorkflowState {
    const tracksList = generateArray({
        minLength: 2,
        maxLength: 6,
        fill: generateTrackMetadata,
    });

    return {
        roomID: datatype.uuid(),
        roomCreatorUserID: datatype.uuid(),
        name: random.words(),
        tracks: tracksList,
        isOpen: datatype.boolean(),
        isOpenOnlyInvitedUsersCanEdit: datatype.boolean(),
        usersLength: datatype.number(),
        playlistTotalDuration: datatype.number(),
        userRelatedInformation: null,
        ...overrides,
    };
}

export function generateMpeWorkflowStateWithUserRelatedInformation({
    overrides,
    userID,
}: {
    overrides?: Partial<MpeWorkflowStateWithUserRelatedInformation>;
    userID: string;
}): MpeWorkflowStateWithUserRelatedInformation {
    const tracksList = generateArray({
        minLength: 2,
        maxLength: 6,
        fill: generateTrackMetadata,
    });

    return {
        roomID: datatype.uuid(),
        roomCreatorUserID: datatype.uuid(),
        name: random.words(),
        tracks: tracksList,
        isOpen: datatype.boolean(),
        isOpenOnlyInvitedUsersCanEdit: datatype.boolean(),
        usersLength: datatype.number(),
        playlistTotalDuration: datatype.number(),
        userRelatedInformation: {
            userHasBeenInvited: false,
            userID,
        },
        ...overrides,
    };
}

export function noop(): void {
    return undefined;
}

export function createSpyOnClientSocketEvent<
    Event extends keyof AllServerToClientEvents,
>(
    socket: TypedTestSocket,
    event: Event,
): sinon.SinonSpy<
    Parameters<AllServerToClientEvents[Event]>,
    ReturnType<AllServerToClientEvents[Event]>
> {
    const customSpy = sinon.spy<AllServerToClientEvents[Event]>(noop);

    //@ts-expect-error socket will raise a type error as customSpy doesn't wrap native socket-io event
    socket.on(event, customSpy);
    return customSpy;
}
