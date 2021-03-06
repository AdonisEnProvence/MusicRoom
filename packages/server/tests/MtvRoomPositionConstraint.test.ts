import Database from '@ioc:Adonis/Lucid/Database';
import {
    LatlngCoords,
    MtvWorkflowStateWithUserRelatedInformation,
} from '@musicroom/types';
import MtvServerToTemporalController from 'App/Controllers/Http/Temporal/MtvServerToTemporalController';
import MtvRoom from 'App/Models/MtvRoom';
import GeocodingService from 'App/Services/GeocodingService';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import {
    getDefaultMtvRoomCreateRoomArgs,
    getSocketApiAuthToken,
    initTestUtils,
    sleep,
} from './utils/TestUtils';

test.group(
    `MtvRoom creation with position and time constraints but here testin only position ftm and device position udpate`,
    (group) => {
        const {
            createAuthenticatedUserAndGetSocket,
            disconnectEveryRemainingSocketConnection,
            initSocketConnection,
            createSocketConnection,
            disconnectSocket,
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

        test('It should create an mtv room with position constraint', async (assert) => {
            const settings = getDefaultMtvRoomCreateRoomArgs({
                hasPhysicalAndTimeConstraints: true,
                physicalAndTimeConstraints: {
                    physicalConstraintEndsAt: datatype.string(),
                    physicalConstraintStartsAt: datatype.string(),
                    physicalConstraintPlaceID: datatype.string(),
                    physicalConstraintRadius: datatype.number({
                        min: 400,
                        max: 500,
                    }),
                },
            });
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
                .stub(MtvServerToTemporalController, 'createMtvWorkflow')
                .callsFake(
                    async ({
                        workflowID,
                        params: { creatorFitsPositionConstraint },
                    }) => {
                        //Checking that we tried to retrieve user last known position
                        //By looking for false boolean and not a undefined
                        assert.isFalse(creatorFitsPositionConstraint);
                        assert.notEqual(
                            creatorFitsPositionConstraint,
                            undefined,
                        );
                        const state: MtvWorkflowStateWithUserRelatedInformation =
                            {
                                roomID: workflowID,
                                roomCreatorUserID: datatype.uuid(),
                                playing: false,
                                name: settings.name,
                                playingMode: 'BROADCAST',
                                currentTrack: null,
                                isOpen: true,
                                isOpenOnlyInvitedUsersCanVote: false,
                                hasTimeAndPositionConstraints: false,
                                timeConstraintIsValid: null,
                                delegationOwnerUserID: null,
                                userRelatedInformation: {
                                    userID,
                                    hasControlAndDelegationPermission: true,
                                    emittingDeviceID: datatype.uuid(),
                                    userHasBeenInvited: false,
                                    tracksVotedFor: [],
                                    userFitsPositionConstraint: null,
                                },
                                usersLength: 1,
                                tracks: null,
                                minimumScoreToBePlayed: 1,
                            };

                        return {
                            runID: datatype.uuid(),
                            workflowID,
                            state,
                        };
                    },
                );
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

            socket.emit('MTV_CREATE_ROOM', settings);
            await sleep();

            const rooms = await MtvRoom.all();
            assert.isNotNull(rooms);
            const createdRoom = rooms[0];
            console.log(createdRoom);
            assert.equal(createdRoom.constraintLat, mockedCoords.lat);
            assert.equal(createdRoom.constraintLng, mockedCoords.lng);
        });

        test(`It should compute user permission to vote du too it's device position after
        -Update position
        -Disconnection
        -Device connection`, async (assert) => {
            const roomID = datatype.uuid();
            let mockHasBeenCalled = false;
            let userPositionFitsTheGivenRadius: undefined | boolean;

            const userID = datatype.uuid();
            const socket = await createAuthenticatedUserAndGetSocket({
                userID,
                mtvRoomIDToAssociate: roomID,
            });
            const token = getSocketApiAuthToken(socket);

            const socketB = await createSocketConnection({ userID, token });

            const relatedRoom = await MtvRoom.find(roomID);
            if (relatedRoom === null) throw new Error('mtv room is null');

            const roomCoords = {
                constraintLat: datatype.number({
                    min: 0,
                    max: 80,
                }),
                constraintLng: datatype.number({
                    min: 0,
                    max: 180,
                }),
            };
            relatedRoom.merge({
                hasPositionAndTimeConstraints: true,
                constraintRadius: 100,
                ...roomCoords,
            });
            await relatedRoom.save();

            sinon
                .stub(
                    MtvServerToTemporalController,
                    'updateUserFitsPositionConstraints',
                )
                .callsFake(
                    async ({ userFitsPositionConstraint }): Promise<void> => {
                        mockHasBeenCalled = true;
                        userPositionFitsTheGivenRadius =
                            userFitsPositionConstraint;
                    },
                );

            socketB.emit('UPDATE_DEVICE_POSITION', {
                lat: roomCoords.constraintLat,
                lng: roomCoords.constraintLng,
            });
            await sleep();
            await sleep();

            assert.isTrue(mockHasBeenCalled);
            assert.isTrue(userPositionFitsTheGivenRadius);
            mockHasBeenCalled = false;

            await disconnectSocket(socketB);

            assert.isTrue(mockHasBeenCalled);
            assert.isFalse(userPositionFitsTheGivenRadius);
            mockHasBeenCalled = false;

            await createSocketConnection({ userID, token });

            assert.isTrue(mockHasBeenCalled);
            assert.isFalse(userPositionFitsTheGivenRadius);
        });
    },
);
