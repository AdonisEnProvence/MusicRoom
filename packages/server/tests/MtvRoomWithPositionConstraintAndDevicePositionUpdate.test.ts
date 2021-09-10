import Database from '@ioc:Adonis/Lucid/Database';
import {
    LatlngCoords,
    MtvWorkflowStateWithUserRelatedInformation,
} from '@musicroom/types';
import GeocodingController from 'App/Controllers/Http/GeocodingController';
import ServerToTemporalController from 'App/Controllers/Http/Temporal/ServerToTemporalController';
import MtvRoom from 'App/Models/MtvRoom';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import {
    getDefaultMtvRoomCreateRoomArgs,
    initTestUtils,
    sleep,
} from './utils/TestUtils';

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

        test.only('It should create an mtv room with position constraint', async (assert) => {
            const settings = getDefaultMtvRoomCreateRoomArgs({
                hasPhysicalAndTimeConstraints: true,
                physicalAndTimeConstraints: {
                    physicalConstraintEndsAt: datatype.string(),
                    physicalConstraintStartsAt: datatype.string(),
                    physicalConstraintPlace: datatype.string(),
                    physicalConstraintRadius: datatype.number({
                        min: 10,
                        max: 100,
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
                .stub(ServerToTemporalController, 'createMtvWorkflow')
                .callsFake(async ({ workflowID }) => {
                    const state: MtvWorkflowStateWithUserRelatedInformation = {
                        roomID: workflowID,
                        roomCreatorUserID: datatype.uuid(),
                        playing: false,
                        name: settings.name,
                        currentTrack: null,
                        userRelatedInformation: {
                            userID,
                            emittingDeviceID: datatype.uuid(),
                            tracksVotedFor: [],
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
                });
            sinon
                .stub(GeocodingController, 'getCoordsFromAddress')
                .callsFake(async (): Promise<LatlngCoords> => {
                    return mockedCoords;
                });
            /** ***** */

            const userID = datatype.uuid();
            const socket = await createUserAndGetSocket({ userID });

            socket.emit('CREATE_ROOM', settings);
            await sleep();

            const rooms = await MtvRoom.all();
            assert.isNotNull(rooms);
            const createdRoom = rooms[0];
            console.log(createdRoom);
            assert.equal(createdRoom.constraintLat, mockedCoords.lat);
            assert.equal(createdRoom.constraintLng, mockedCoords.lng);
            console.log('TOUT VA Bien'.repeat(100));
        });
    },
);
