import {
    AllClientToServerEvents,
    AllServerToClientEvents,
    MtvRoomClientToServerCreateArgs,
} from '@musicroom/types';
import ServerToTemporalController from 'App/Controllers/Http/Temporal/ServerToTemporalController';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import { datatype, random } from 'faker';
import sinon from 'sinon';
import { io, Socket } from 'socket.io-client';

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

interface CreateUserAndGetSocketArgs {
    userID: string;
    deviceName?: string;
    browser?: AvailableBrowsersMocks;
    mtvRoomIDToAssociate?: string;
}

interface CreateSocketConnectionArgs {
    userID: string;
    deviceName?: string;
    browser?: AvailableBrowsersMocks;
    requiredEventListeners?: (socket: TypedTestSocket) => void;
}

export const BASE_URL = `http://${process.env.HOST!}:${process.env.PORT!}`;

interface TestUtilsReturnedValue {
    initSocketConnection: () => void;
    disconnectEveryRemainingSocketConnection: () => Promise<void>;
    disconnectSocket: (socket: TypedTestSocket) => Promise<void>;
    createSocketConnection: (
        args: CreateSocketConnectionArgs,
    ) => Promise<TypedTestSocket>;
    createUserAndGetSocket: (
        args: CreateUserAndGetSocketArgs,
    ) => Promise<TypedTestSocket>;
}

export function initTestUtils(): TestUtilsReturnedValue {
    let socketsConnections: TypedTestSocket[] = [];

    const initSocketConnection = (): void => {
        socketsConnections = [];
    };

    const disconnectEveryRemainingSocketConnection =
        async (): Promise<void> => {
            sinon.restore();
            sinon
                .stub(ServerToTemporalController, 'terminateWorkflow')
                .callsFake(async () => {
                    return;
                });
            sinon
                .stub(ServerToTemporalController, 'leaveWorkflow')
                .callsFake(async () => {
                    return;
                });

            socketsConnections.forEach((socket) => {
                socket.disconnect();
            });
            await sleep();
        };

    const disconnectSocket = async (socket: TypedTestSocket): Promise<void> => {
        socket.disconnect();
        socketsConnections = socketsConnections.filter(
            (el) => el.id !== socket.id,
        );
        await sleep();
    };

    const createSocketConnection = async ({
        userID,
        browser,
        deviceName,
        requiredEventListeners,
    }: CreateSocketConnectionArgs): Promise<TypedTestSocket> => {
        const query: { [key: string]: string } = {
            userID,
        };
        if (deviceName) query.deviceName = deviceName;

        const extraHeaders: { [key: string]: string } = {};
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
        await sleep();
        return socket;
    };

    const createUserAndGetSocket = async ({
        userID,
        deviceName,
        browser,
        mtvRoomIDToAssociate,
    }: CreateUserAndGetSocketArgs): Promise<TypedTestSocket> => {
        const createdUser = await User.create({
            uuid: userID,
            nickname: random.word(),
        });
        if (mtvRoomIDToAssociate !== undefined) {
            let mtvRoomToAssociate = await MtvRoom.find(mtvRoomIDToAssociate);

            if (mtvRoomToAssociate === null) {
                mtvRoomToAssociate = await MtvRoom.create({
                    uuid: mtvRoomIDToAssociate,
                    runID: datatype.uuid(),
                    creator: createdUser.uuid,
                });
            }
            await createdUser.related('mtvRoom').associate(mtvRoomToAssociate);
        }
        //No need to remoteJoin the created socket as SocketLifeCycle.registerDevice will do it for us
        return await createSocketConnection({ userID, deviceName, browser });
    };

    return {
        createSocketConnection,
        createUserAndGetSocket,
        disconnectSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
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
