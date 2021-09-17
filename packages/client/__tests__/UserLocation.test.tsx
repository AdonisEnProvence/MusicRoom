import { MtvWorkflowState } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import Location, {
    getCurrentPositionAsync,
    requestForegroundPermissionsAsync,
} from 'expo-location';
import { datatype, random } from 'faker';
import React from 'react';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata } from '../tests/data';
import { noop, render, waitForTimeout } from '../tests/tests-utils';
// import { (funcToMock as jest.Mock) } from './somewhere'; // If using TypeScript
jest.mock('expo-location');

test(`It should get the user position at his retrieving a room with constraints`, async () => {
    const tracksList = [generateTrackMetadata(), generateTrackMetadata()];
    const requestForegroundPermissionsAsyncMocked =
        requestForegroundPermissionsAsync as jest.Mock;
    const getCurrentPositionAsyncMocked = getCurrentPositionAsync as jest.Mock;

    requestForegroundPermissionsAsyncMocked.mockImplementation(() => {
        console.log('EKKKKKKKKKKKKKKKKKKKKKk'.repeat(100));
        return {
            status: 'granted',
        };
    });

    const location: Location.LocationObject = {
        timestamp: datatype.number(),
        coords: {
            accuracy: 4,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            latitude: datatype.number(),
            longitude: datatype.number(),
            speed: null,
        },
    };

    getCurrentPositionAsyncMocked.mockImplementation((args) => {
        console.log('MOCK IS BEING CALLED'.repeat(10));
        return location;
    });

    const roomCreatorUserID = datatype.uuid();
    const initialState: MtvWorkflowState = {
        name: random.words(),
        roomID: datatype.uuid(),
        playing: false,
        roomCreatorUserID,
        roomHasTimeAndPositionConstraints: true,
        timeConstraintIsValid: true,
        userRelatedInformation: {
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

    serverSocket.on('GET_CONTEXT', () => {
        serverSocket.emit('RETRIEVE_CONTEXT', initialState);
    });

    serverSocket.on('UPDATE_DEVICE_POSITION', () => {
        receivedEvents.push('UPDATE_DEVICE_POSITION');
        console.log('DEVICE UPDATE RECEVIED');
    });

    render(
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                isReadyRef.current = true;
            }}
        >
            <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
        </NavigationContainer>,
    );

    await waitForTimeout(100);

    expect(receivedEvents.length).toBe(1);
});
