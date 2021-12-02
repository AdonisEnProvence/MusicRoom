import {
    MtvPlayingModes,
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
    getCurrentPositionAsyncMocked,
    requestForegroundPermissionsAsyncMocked,
} from '../jest.setup';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata } from '../tests/data';
import { fireEvent, noop, render, waitFor } from '../tests/tests-utils';

/* eslint-disable @typescript-eslint/require-await */

/**
 * Concerning the element .toBeDisabled and .toBeEnabled assertions.
 * We're following a global rule:
 * - element.toBeDisabled checks the element and his parent.
 * - element.toBeEnabled checks the element only
 * We prefer checking the element and it's parents, then we will using element.toBeDisabled only.
 * In this way to check if an element is enabled we will use element.not.disabled
 */

describe('Room with constraints tests', () => {
    afterAll(() => {
        requestForegroundPermissionsAsyncMocked.mockClear();
        getCurrentPositionAsyncMocked.mockClear();
    });

    it(`Depending on time and position constraint it should disable or not track card`, async () => {
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

        getCurrentPositionAsyncMocked.mockImplementation(async () => {
            return location;
        });

        const tracksList = [
            generateTrackMetadata({
                score: 0,
            }),
        ];

        const roomCreatorUserID = datatype.uuid();
        const initialState: MtvWorkflowStateWithUserRelatedInformation = {
            name: random.words(),
            roomID: datatype.uuid(),
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

        //Track cards should be disabled
        await waitFor(() => {
            expect(screen.getByText(tracksList[0].title)).toBeTruthy();
            expect(
                screen.getByTestId(`${tracksList[0].id}-track-card`),
            ).toBeDisabled();
            expect(screen.getByText(tracksList[0].title)).toBeDisabled();
            expect(screen.getByText(new RegExp(`0/1`))).toBeTruthy();
        });

        //Emit new permission server socket event
        const initialStateCpyA = {
            ...initialState,
            timeConstraintIsValid: true,
            userRelatedInformation: {
                ...initialState.userRelatedInformation,
                userFitsPositionConstraint: false,
            },
        };
        serverSocket.emit('MTV_USER_PERMISSIONS_UPDATE', initialStateCpyA);

        //Track cards should be disabled
        await waitFor(() => {
            expect(
                screen.getByTestId(`${tracksList[0].id}-track-card`),
            ).toBeDisabled();
            expect(screen.getByText(tracksList[0].title)).toBeDisabled();
        });

        //Emit new permission server socket event

        const initialStateCpyB = {
            ...initialStateCpyA,
            userRelatedInformation: {
                ...initialStateCpyA.userRelatedInformation,
                userFitsPositionConstraint: true,
            },
        };
        serverSocket.emit('MTV_USER_PERMISSIONS_UPDATE', initialStateCpyB);

        //Track cards should be enabled
        await waitFor(() => {
            expect(
                screen.getByTestId(`${tracksList[0].id}-track-card`),
            ).not.toBeDisabled();
            expect(screen.getByText(tracksList[0].title)).not.toBeDisabled();
        });

        //Revoking timeConstraintIsValid
        const initialStateCpyC = {
            ...initialStateCpyB,
            timeConstraintIsValid: false,
        };
        serverSocket.emit('MTV_TIME_CONSTRAINT_UPDATE', initialStateCpyC);

        //Track cards should be disabled
        await waitFor(() => {
            expect(
                screen.getByTestId(`${tracksList[0].id}-track-card`),
            ).toBeDisabled();
            expect(screen.getByText(tracksList[0].title)).toBeDisabled();
        });
    });
});
