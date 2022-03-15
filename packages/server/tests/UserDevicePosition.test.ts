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
            createAuthenticatedUserAndGetSocket,
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
            const socket = await createAuthenticatedUserAndGetSocket({
                userID,
            });

            socket.emit('UPDATE_DEVICE_POSITION', mockedCoords);
            await sleep();

            const device = await Device.findBy('socket_id', socket.id);
            assert.isNotNull(device);
            assert.equal(device?.lat, mockedCoords.lat);
            assert.equal(device?.lng, mockedCoords.lng);
            assert.isNotNull(device?.latLngUpdatedAt);
        });

        test(`It should find user fits position and then doesnot anymore as his device coords are more than 24hours old`, async (assert) => {
            const roomID = datatype.uuid();
            const userID = datatype.uuid();
            await createAuthenticatedUserAndGetSocket({
                userID,
                mtvRoomIDToAssociate: roomID,
            });
            const user = await User.findOrFail(userID);

            await user.load('devices');
            const relatedDevices = user.devices;
            if (
                relatedDevices === null ||
                (relatedDevices !== null && relatedDevices.length !== 1)
            ) {
                throw new Error('related devices is corrupted');
            }
            const relatedDevice = relatedDevices[0];

            await user.load('mtvRoom');
            const relatedRoom = user.mtvRoom;
            if (relatedRoom === null) {
                throw new Error('mtv room is null');
            }

            const constraintLat = datatype.number({
                min: 0,
                max: 80,
            });
            const constraintLng = datatype.number({
                min: 0,
                max: 180,
            });
            const constraintRadius = 100;
            const roomCoords = {
                constraintLat,
                constraintLng,
            };
            relatedRoom.merge({
                hasPositionAndTimeConstraints: true,
                constraintRadius,
                ...roomCoords,
            });
            await relatedRoom.save();

            relatedDevice.merge({
                lat: constraintLat,
                lng: constraintLng,
                latLngUpdatedAt: DateTime.now(),
            });
            await relatedDevice.save();

            assert.isTrue(
                await MtvRoomsWsController.checkUserDevicesPositionIfRoomHasPositionConstraints(
                    {
                        persistToTemporalRequiredInformation: undefined,
                        roomConstraintInformation: {
                            constraintLat,
                            constraintLng,
                            constraintRadius,
                            hasPositionAndTimeConstraints: true,
                        },
                        user,
                    },
                ),
            );

            relatedDevice.merge({
                latLngUpdatedAt: DateTime.now().plus({
                    days: -1,
                    minutes: -1,
                }),
            });
            await relatedDevice.save();

            assert.isFalse(
                await MtvRoomsWsController.checkUserDevicesPositionIfRoomHasPositionConstraints(
                    {
                        persistToTemporalRequiredInformation: undefined,
                        roomConstraintInformation: {
                            constraintLat,
                            constraintLng,
                            constraintRadius,
                            hasPositionAndTimeConstraints: true,
                        },
                        user,
                    },
                ),
            );
        });
    },
);
