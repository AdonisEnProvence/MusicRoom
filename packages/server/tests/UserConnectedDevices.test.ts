import Database from '@ioc:Adonis/Lucid/Database';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import Device from '../app/Models/Device';
import {
    createSpyOnClientSocketEvent,
    initTestUtils,
    sleep,
} from './utils/TestUtils';

test.group(
    `User Controller tests, connected devices alerts and info fetching`,
    (group) => {
        const {
            createSocketConnection,
            createUserAndGetSocket,
            disconnectEveryRemainingSocketConnection,
            disconnectSocket,
            initSocketConnection,
            waitFor,
        } = initTestUtils();

        group.beforeEach(async () => {
            initSocketConnection();
            await Database.beginGlobalTransaction();
        });

        group.afterEach(async () => {
            await disconnectEveryRemainingSocketConnection();
            sinon.restore();
            await Database.rollbackGlobalTransaction();
        });

        test('It should send to every user socket instance the CONNECTED_DEVICES_UPDATE socket event on device co/dc', async (assert) => {
            const userID = datatype.uuid();
            const socketA = await createUserAndGetSocket({ userID });

            const socketAConnectedDevicesSpy = createSpyOnClientSocketEvent(
                socketA,
                'CONNECTED_DEVICES_UPDATE',
            );

            const socketB = await createSocketConnection({ userID });
            await waitFor(() => {
                assert.isTrue(socketAConnectedDevicesSpy.calledOnce);
            });

            await disconnectSocket(socketB);

            await waitFor(() => {
                assert.isTrue(socketAConnectedDevicesSpy.calledTwice);
            });
        });

        test('It should send back the user connected device list', async (assert) => {
            const userID = datatype.uuid();
            const deviceNameA = random.word();

            const socketA = await createUserAndGetSocket({
                userID,
                deviceName: deviceNameA,
            });

            const deviceA = await Device.findBy('socket_id', socketA.id);
            assert.isNotNull(deviceA);
            if (deviceA === null) throw new Error('DeviceA should not be null');

            let callbackHasBeenCalled = false;
            await createSocketConnection({ userID, browser: 'Safari' });

            socketA.emit(
                'GET_CONNECTED_DEVICES_AND_DEVICE_ID',
                ({ devices, currDeviceID }) => {
                    assert.equal(deviceA.uuid, currDeviceID);

                    assert.equal(2, devices.length);

                    assert.isTrue(devices.some((d) => d.name === deviceNameA));

                    assert.isTrue(
                        devices.some((d) => d.name === 'Web Player (Safari)'),
                    );

                    callbackHasBeenCalled = true;
                },
            );

            await sleep();
            assert.isTrue(callbackHasBeenCalled);
        });
    },
);
