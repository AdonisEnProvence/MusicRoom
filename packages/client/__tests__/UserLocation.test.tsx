import { MtvWorkflowState } from '@musicroom/types';
import {
    LocationObject,
    LocationPermissionResponse,
    PermissionStatus,
} from 'expo-location';
import { datatype, random } from 'faker';
import {
    getCurrentPositionAsyncMocked,
    requestForegroundPermissionsAsyncMocked,
} from '../jest.setup';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata } from '../tests/data';
import {
    fireEvent,
    renderApp,
    waitForTimeout,
    within,
} from '../tests/tests-utils';

/* eslint-disable @typescript-eslint/require-await */

describe('User device location tests', () => {
    afterAll(() => {
        requestForegroundPermissionsAsyncMocked.mockClear();
        getCurrentPositionAsyncMocked.mockClear();
    });

    it(`It should get the user position via retrieving a room with constraints`, async () => {
        const tracksList = [generateTrackMetadata(), generateTrackMetadata()];
        requestForegroundPermissionsAsyncMocked.mockImplementationOnce(
            async () => {
                const res: LocationPermissionResponse = {
                    canAskAgain: true,
                    expires: 'never',
                    granted: true,
                    status: 'granted' as PermissionStatus.GRANTED,
                };
                return res;
            },
        );

        const location: LocationObject = {
            timestamp: datatype.number(),
            coords: {
                accuracy: 4,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                latitude: datatype.number({
                    min: -80,
                    max: 75,
                }),
                longitude: datatype.number({
                    min: -180,
                    max: 175,
                }),
                speed: null,
            },
        };

        getCurrentPositionAsyncMocked.mockImplementationOnce(async () => {
            return location;
        });

        getCurrentPositionAsyncMocked.mockImplementation(async () => {
            return {
                ...location,
                coords: {
                    ...location.coords,
                    latitude: location.coords.latitude + 2,
                    longitude: location.coords.longitude + 2,
                },
            };
        });
        const roomCreatorUserID = datatype.uuid();
        const initialState: MtvWorkflowState = {
            name: random.words(),
            roomID: datatype.uuid(),
            playing: false,
            playingMode: 'BROADCAST',
            roomCreatorUserID,
            isOpen: true,
            isOpenOnlyInvitedUsersCanVote: false,
            hasTimeAndPositionConstraints: true,
            timeConstraintIsValid: true,
            delegationOwnerUserID: null,
            userRelatedInformation: {
                hasControlAndDelegationPermission: true,
                userHasBeenInvited: false,
                userFitsPositionConstraint: false,
                emittingDeviceID: datatype.uuid(),
                userID: roomCreatorUserID,
                tracksVotedFor: [],
            },
            usersLength: 1,
            currentTrack: {
                ...tracksList[0],
                elapsed: 0,
            },
            tracks: tracksList.slice(1),
            minimumScoreToBePlayed: 1,
        };

        const receivedEvents: string[] = [];

        serverSocket.on('MTV_GET_CONTEXT', () => {
            serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
        });

        serverSocket.on('UPDATE_DEVICE_POSITION', () => {
            receivedEvents.push('UPDATE_DEVICE_POSITION');
        });

        const screen = await renderApp();

        await waitForTimeout(1000);

        expect(receivedEvents.length).toBe(2);
        expect(requestForegroundPermissionsAsyncMocked).toBeCalledTimes(1);
        expect(getCurrentPositionAsyncMocked).toBeCalled();

        const musicPlayerMini = screen.getByTestId('music-player-mini');
        expect(musicPlayerMini).toBeTruthy();

        fireEvent.press(musicPlayerMini);

        const musicPlayerFullScreen = await screen.findByA11yState({
            expanded: true,
        });
        expect(musicPlayerFullScreen).toBeTruthy();

        /**
         * Toggle Settings tab
         * And Search for leave room button
         */

        const goSettingsButton = within(musicPlayerFullScreen).getByText(
            /Settings/i,
        );
        expect(goSettingsButton).toBeTruthy();
        fireEvent.press(goSettingsButton);

        expect(await screen.findByText(/settings tab/i)).toBeTruthy();

        /**
         * Press on the leave room button
         */
        const requestLocationButton = within(musicPlayerFullScreen).getByText(
            /LOCATION/i,
        );
        expect(requestLocationButton).toBeTruthy();
        fireEvent.press(requestLocationButton);

        await waitForTimeout(1000);
        expect(requestForegroundPermissionsAsyncMocked).toBeCalledTimes(2);
    });
});
