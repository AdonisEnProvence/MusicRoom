import Database from '@ioc:Adonis/Lucid/Database';
import { LatlngCoords } from '@musicroom/types';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import User from 'App/Models/User';
import GeocodingService from 'App/Services/GeocodingService';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { DateTime } from 'luxon';
import { initTestUtils, sleep } from './utils/TestUtils';

test.group(
    `MtvRoom creation with position and time constraints but here testin only position ftm and device position udpate`,
    (group) => {
        const {
            createUserAndGetSocket,
            disconnectEveryRemainingSocketConnection,
            initSocketConnection,
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

        test('It should update device position', async (assert) => {
            const mockedCoords: LatlngCoords = {
                lat: datatype.number({
                    min: 10,
                    max: 50,
                }),
                lng: datatype.number({
                    min: 10,
                    max: 50,
                }),
            };

            /** Mocks */
            sinon
                .stub(GeocodingService, 'getCoordsFromAddress')
                .callsFake(async (): Promise<LatlngCoords> => {
                    return mockedCoords;
                });
            /** ***** */

            const userID = datatype.uuid();
            const socket = await createUserAndGetSocket({ userID });

            socket.emit('UPDATE_DEVICE_POSITION', mockedCoords);
            await sleep();

            const device = await Device.findBy('socket_id', socket.id);
            assert.isNotNull(device);
            assert.equal(device?.lat, mockedCoords.lat);
            assert.equal(device?.lng, mockedCoords.lng);
            assert.isNotNull(device?.latLngUpdatedAt);
        });
    },
);
