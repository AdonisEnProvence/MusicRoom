import {
    MtvPlayingModes,
    MtvRoomGetRoomConstraintDetailsCallbackArgs,
    MtvWorkflowStateWithUserRelatedInformation,
} from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import {
    LocationObject,
    LocationPermissionResponse,
    PermissionStatus,
} from 'expo-location';
import { datatype, random } from 'faker';
import React from 'react';
import {
    formatDateTime,
    parseIsoDateTimeString,
} from '../hooks/useFormatDateTime';
import {
    getCurrentPositionAsyncMocked,
    requestForegroundPermissionsAsyncMocked,
} from '../jest.setup';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata } from '../tests/data';
import { fireEvent, noop, render, within, waitFor } from '../tests/tests-utils';

/* eslint-disable @typescript-eslint/require-await */

describe('Mtv room contraints details test group', () => {
    beforeAll(() => {
        requestForegroundPermissionsAsyncMocked.mockClear();
        getCurrentPositionAsyncMocked.mockClear();
    });

    afterEach(() => {
        requestForegroundPermissionsAsyncMocked.mockClear();
        getCurrentPositionAsyncMocked.mockClear();
    });

    it(`It should not display the constraints details redirect button if the room doesn't have constraints`, async () => {
        const tracksList = [
            generateTrackMetadata({
                score: 0,
            }),
        ];
        const roomID = datatype.uuid();
        const roomCreatorUserID = datatype.uuid();
        const initialState: MtvWorkflowStateWithUserRelatedInformation = {
            name: random.words(),
            roomID,
            playing: false,
            playingMode: MtvPlayingModes.Values.BROADCAST,
            roomCreatorUserID,
            isOpen: false,
            isOpenOnlyInvitedUsersCanVote: false,
            hasTimeAndPositionConstraints: false,
            timeConstraintIsValid: false,
            delegationOwnerUserID: null,
            userRelatedInformation: {
                hasControlAndDelegationPermission: true,
                userFitsPositionConstraint: false,
                emittingDeviceID: datatype.uuid(),
                userID: roomCreatorUserID,
                userHasBeenInvited: false,
                tracksVotedFor: [],
            },
            usersLength: 1,
            currentTrack: null,
            tracks: tracksList,
            minimumScoreToBePlayed: 1,
        };

        serverSocket.on('MTV_GET_CONTEXT', () => {
            serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
        });

        let mockHasbeenCalled = false;
        serverSocket.on('MTV_GET_ROOM_CONSTRAINTS_DETAILS', (cb) => {
            mockHasbeenCalled = true;
        });

        const screen = render(
            <NavigationContainer
                ref={navigationRef}
                onReady={() => {
                    isReadyRef.current = true;
                }}
            >
                <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
            </NavigationContainer>,
        );

        expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

        const musicPlayerMini = screen.getByTestId('music-player-mini');
        expect(musicPlayerMini).toBeTruthy();

        fireEvent.press(musicPlayerMini);

        const musicPlayerFullScreen = await screen.findByA11yState({
            expanded: true,
        });
        expect(musicPlayerFullScreen).toBeTruthy();

        const goToConstraintsDetailsButton = within(
            musicPlayerFullScreen,
        ).queryByA11yLabel(/Open.*constraints.*details.*/);
        expect(goToConstraintsDetailsButton).toBeNull();
    });

    it(`It should show room constraints details modal and:
    - ask for location permission when entering it
    - send a GET_CONSTRAINT_DETAILS client socket event to the server`, async () => {
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

        const tracksList = [
            generateTrackMetadata({
                score: 0,
            }),
        ];
        const roomID = datatype.uuid();
        const roomCreatorUserID = datatype.uuid();
        const initialState: MtvWorkflowStateWithUserRelatedInformation = {
            name: random.words(),
            roomID,
            playing: false,
            playingMode: MtvPlayingModes.Values.BROADCAST,
            roomCreatorUserID,
            isOpen: false,
            isOpenOnlyInvitedUsersCanVote: false,
            hasTimeAndPositionConstraints: true,
            timeConstraintIsValid: false,
            delegationOwnerUserID: null,
            userRelatedInformation: {
                hasControlAndDelegationPermission: true,
                userFitsPositionConstraint: false,
                emittingDeviceID: datatype.uuid(),
                userID: roomCreatorUserID,
                userHasBeenInvited: false,
                tracksVotedFor: [],
            },
            usersLength: 1,
            currentTrack: null,
            tracks: tracksList,
            minimumScoreToBePlayed: 1,
        };

        serverSocket.on('MTV_GET_CONTEXT', () => {
            serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
        });

        let mockHasbeenCalled = false;
        serverSocket.on('MTV_GET_ROOM_CONSTRAINTS_DETAILS', (cb) => {
            mockHasbeenCalled = true;
        });

        const screen = render(
            <NavigationContainer
                ref={navigationRef}
                onReady={() => {
                    isReadyRef.current = true;
                }}
            >
                <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
            </NavigationContainer>,
        );

        expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

        const musicPlayerMini = screen.getByTestId('music-player-mini');
        expect(musicPlayerMini).toBeTruthy();

        fireEvent.press(musicPlayerMini);

        const musicPlayerFullScreen = await screen.findByA11yState({
            expanded: true,
        });
        expect(musicPlayerFullScreen).toBeTruthy();

        const goToConstraintsDetailsButton = within(
            musicPlayerFullScreen,
        ).getByA11yLabel(/Open.*constraints.*details.*/);
        expect(goToConstraintsDetailsButton).toBeTruthy();
        expect(goToConstraintsDetailsButton).toBeEnabled();
        await fireEvent.press(goToConstraintsDetailsButton);
        await waitFor(() => {
            expect(screen.getByText('Mtv Room Constraints')).toBeTruthy();
        });

        expect(requestForegroundPermissionsAsyncMocked).toBeCalledTimes(3);
        expect(mockHasbeenCalled).toBeTruthy();
    });

    it(`It should display a map with room position constraint marker+radius then after getting location permission should display a device position marker`, async () => {
        requestForegroundPermissionsAsyncMocked.mockImplementationOnce(
            async () => {
                const res: LocationPermissionResponse = {
                    canAskAgain: true,
                    expires: 'never',
                    granted: false,
                    status: 'denied' as PermissionStatus.DENIED,
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

        getCurrentPositionAsyncMocked.mockImplementation(async () => {
            return location;
        });

        const tracksList = [
            generateTrackMetadata({
                score: 0,
            }),
        ];

        const roomID = datatype.uuid();
        const roomCreatorUserID = datatype.uuid();
        const initialState: MtvWorkflowStateWithUserRelatedInformation = {
            name: random.words(),
            roomID,
            playing: false,
            playingMode: MtvPlayingModes.Values.BROADCAST,
            roomCreatorUserID,
            isOpen: false,
            isOpenOnlyInvitedUsersCanVote: false,
            hasTimeAndPositionConstraints: true,
            timeConstraintIsValid: false,
            delegationOwnerUserID: null,
            userRelatedInformation: {
                hasControlAndDelegationPermission: true,
                userFitsPositionConstraint: false,
                emittingDeviceID: datatype.uuid(),
                userID: roomCreatorUserID,
                userHasBeenInvited: false,
                tracksVotedFor: [],
            },
            usersLength: 1,
            currentTrack: null,
            tracks: tracksList,
            minimumScoreToBePlayed: 1,
        };

        serverSocket.on('MTV_GET_CONTEXT', () => {
            serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
        });

        let mockHasbeenCalled = false;
        const fakeConstraintsDetails: MtvRoomGetRoomConstraintDetailsCallbackArgs =
            {
                physicalConstraintEndsAt: datatype.datetime().toISOString(),
                physicalConstraintStartsAt: datatype.datetime().toISOString(),
                physicalConstraintPosition: {
                    lng: 42,
                    lat: 42,
                },
                physicalConstraintRadius: 1000,
                roomID,
            };
        serverSocket.on('MTV_GET_ROOM_CONSTRAINTS_DETAILS', (cb) => {
            mockHasbeenCalled = true;
            cb(fakeConstraintsDetails);
        });

        const screen = render(
            <NavigationContainer
                ref={navigationRef}
                onReady={() => {
                    isReadyRef.current = true;
                }}
            >
                <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
            </NavigationContainer>,
        );

        expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

        const musicPlayerMini = screen.getByTestId('music-player-mini');
        expect(musicPlayerMini).toBeTruthy();

        fireEvent.press(musicPlayerMini);

        const musicPlayerFullScreen = await screen.findByA11yState({
            expanded: true,
        });
        expect(musicPlayerFullScreen).toBeTruthy();

        const goToConstraintsDetailsButton = within(
            musicPlayerFullScreen,
        ).getByA11yLabel(/Open.*constraints.*details.*/);
        expect(goToConstraintsDetailsButton).toBeTruthy();
        expect(goToConstraintsDetailsButton).toBeEnabled();
        await fireEvent.press(goToConstraintsDetailsButton);
        await waitFor(() => {
            expect(screen.getByText('Mtv Room Constraints')).toBeTruthy();
        });
        expect(mockHasbeenCalled).toBeTruthy();

        //Looking for map

        // looking for position-constraint-marker
        const positionConstraintCenterMarker = screen.getByTestId(
            'position-constraint-marker',
        );
        expect(positionConstraintCenterMarker).toBeTruthy();
        expect(positionConstraintCenterMarker).toHaveProp('coordinate', {
            latitude: fakeConstraintsDetails.physicalConstraintPosition.lat,
            longitude: fakeConstraintsDetails.physicalConstraintPosition.lng,
        });
        expect(positionConstraintCenterMarker).toHaveProp(
            'title',
            'Music Track Vote',
        );

        // looking for position-constraint-circle
        const positionConstraintCircle = screen.getByTestId(
            'position-constraint-circle',
        );
        expect(positionConstraintCircle).toBeTruthy();
        expect(positionConstraintCircle).toHaveProp('center', {
            latitude: fakeConstraintsDetails.physicalConstraintPosition.lat,
            longitude: fakeConstraintsDetails.physicalConstraintPosition.lng,
        });
        expect(positionConstraintCircle).toHaveProp(
            'radius',
            fakeConstraintsDetails.physicalConstraintRadius,
        );

        // should not find device-position-marker as permissions are not allowed
        const devicePositionMarker = screen.queryByTestId(
            'device-position-marker',
        );
        expect(devicePositionMarker).toBeNull();

        //User manually allow location permission
        requestForegroundPermissionsAsyncMocked.mockClear();
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

        const getDevicePositionButton = screen.getByText('Get device position');
        expect(getDevicePositionButton).toBeTruthy();
        expect(getDevicePositionButton).toBeEnabled();
        await fireEvent.press(getDevicePositionButton);

        await waitFor(() => {
            // should not find device-position-marker as permissions are not allowed
            const secondDevicePositionMarker = screen.queryByTestId(
                'device-position-marker',
            );
            expect(secondDevicePositionMarker).toBeTruthy();
            expect(secondDevicePositionMarker).toHaveProp('coordinate', {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
            expect(secondDevicePositionMarker).toHaveProp('title', 'You');
        });

        //Button should disappear
        expect(screen.queryByText('Get device position')).toBeNull();
    });

    it(`it should display time constraint formatted in a human readable format
    also it should notify the user if fits the position constraint`, async () => {
        const tracksList = [
            generateTrackMetadata({
                score: 0,
            }),
        ];

        const roomID = datatype.uuid();
        const roomCreatorUserID = datatype.uuid();
        const initialState: MtvWorkflowStateWithUserRelatedInformation = {
            name: random.words(),
            roomID,
            playing: false,
            playingMode: MtvPlayingModes.Values.BROADCAST,
            roomCreatorUserID,
            isOpen: false,
            isOpenOnlyInvitedUsersCanVote: false,
            hasTimeAndPositionConstraints: true,
            timeConstraintIsValid: false,
            delegationOwnerUserID: null,
            userRelatedInformation: {
                hasControlAndDelegationPermission: true,
                userFitsPositionConstraint: false,
                emittingDeviceID: datatype.uuid(),
                userID: roomCreatorUserID,
                userHasBeenInvited: false,
                tracksVotedFor: [],
            },
            usersLength: 1,
            currentTrack: null,
            tracks: tracksList,
            minimumScoreToBePlayed: 1,
        };

        serverSocket.on('MTV_GET_CONTEXT', () => {
            serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
        });

        let mockHasbeenCalled = false;
        const fakeConstraintsDetails: MtvRoomGetRoomConstraintDetailsCallbackArgs =
            {
                physicalConstraintEndsAt: datatype.datetime().toISOString(),
                physicalConstraintStartsAt: datatype.datetime().toISOString(),
                physicalConstraintPosition: {
                    lng: 42,
                    lat: 42,
                },
                physicalConstraintRadius: 1000,
                roomID,
            };
        serverSocket.on('MTV_GET_ROOM_CONSTRAINTS_DETAILS', (cb) => {
            mockHasbeenCalled = true;
            cb(fakeConstraintsDetails);
        });

        const screen = render(
            <NavigationContainer
                ref={navigationRef}
                onReady={() => {
                    isReadyRef.current = true;
                }}
            >
                <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
            </NavigationContainer>,
        );

        expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

        const musicPlayerMini = screen.getByTestId('music-player-mini');
        expect(musicPlayerMini).toBeTruthy();

        fireEvent.press(musicPlayerMini);

        const musicPlayerFullScreen = await screen.findByA11yState({
            expanded: true,
        });
        expect(musicPlayerFullScreen).toBeTruthy();

        const goToConstraintsDetailsButton = within(
            musicPlayerFullScreen,
        ).getByA11yLabel(/Open.*constraints.*details.*/);
        expect(goToConstraintsDetailsButton).toBeTruthy();
        expect(goToConstraintsDetailsButton).toBeEnabled();
        await fireEvent.press(goToConstraintsDetailsButton);
        await waitFor(() => {
            expect(screen.getByText('Mtv Room Constraints')).toBeTruthy();
        });
        expect(mockHasbeenCalled).toBeTruthy();

        //looking for time constraint labels
        const expectedStartsAtReadableDate = formatDateTime(
            parseIsoDateTimeString(
                fakeConstraintsDetails.physicalConstraintStartsAt,
            ),
        );
        expect(screen.getByText(expectedStartsAtReadableDate)).toBeTruthy();

        const expectedEndsAtReadableDate = formatDateTime(
            parseIsoDateTimeString(
                fakeConstraintsDetails.physicalConstraintEndsAt,
            ),
        );
        expect(screen.getByText(expectedEndsAtReadableDate)).toBeTruthy();

        //User does not fit position constraint label
        expect(
            screen.getByText(/You do not.*fit.*position constraint/i),
        ).toBeTruthy();

        serverSocket.emit('MTV_USER_PERMISSIONS_UPDATE', {
            ...initialState,
            userRelatedInformation: {
                ...initialState.userRelatedInformation,
                userFitsPositionConstraint: true,
            },
        });

        await waitFor(() => {
            //User fits position constraint label
            expect(
                screen.getByText(
                    /You.*fit.*position.*constraint.*at least one of your device is in the zone/i,
                ),
            ).toBeTruthy();
        });
    });
});
