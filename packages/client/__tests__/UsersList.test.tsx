import { MtvPlayingModes, MtvWorkflowState } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
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
import {
    fireEvent,
    getFakeUsersList,
    noop,
    render,
    waitFor,
    within,
} from '../tests/tests-utils';

/* eslint-disable @typescript-eslint/require-await */

describe('User list tests', () => {
    afterAll(() => {
        requestForegroundPermissionsAsyncMocked.mockClear();
        getCurrentPositionAsyncMocked.mockClear();
    });

    it(`It should display a user card for each users in the direct mtv room
    As the device owner is the creator it should be able to open every user's settings even itself
    Where we should find the set as delegation owner button and toggle permission switch for every user
    Except for the creator where we should find only the delegation owner button`, async () => {
        const tracksList = [generateTrackMetadata(), generateTrackMetadata()];

        const roomCreatorUserID = datatype.uuid();
        const initialState: MtvWorkflowState = {
            name: random.words(),
            roomID: datatype.uuid(),
            playing: false,
            playingMode: MtvPlayingModes.Values.DIRECT,
            roomCreatorUserID,
            isOpen: true,
            isOpenOnlyInvitedUsersCanVote: false,
            hasTimeAndPositionConstraints: false,
            timeConstraintIsValid: null,
            delegationOwnerUserID: null,
            userRelatedInformation: {
                hasControlAndDelegationPermission: true,
                userFitsPositionConstraint: null,
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

        const fakeUsersArray = getFakeUsersList({
            directMode: true,
            isMeIsCreator: true,
            length: 5,
        });

        serverSocket.on('GET_CONTEXT', () => {
            serverSocket.emit('RETRIEVE_CONTEXT', initialState);
        });

        serverSocket.on('GET_USERS_LIST', (cb) => {
            cb(fakeUsersArray);
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

        const miniPlayerTrackTitle = await within(musicPlayerMini).findByText(
            new RegExp(`${tracksList[0].title}.*${tracksList[0].artistName}`),
        );
        expect(miniPlayerTrackTitle).toBeTruthy();

        fireEvent.press(miniPlayerTrackTitle);

        const musicPlayerFullScreen = await screen.findByA11yState({
            expanded: true,
        });
        expect(musicPlayerFullScreen).toBeTruthy();
        expect(
            within(musicPlayerFullScreen).getByText(tracksList[0].title),
        ).toBeTruthy();

        const listenersButton = await screen.getByText(/listeners/i);
        expect(listenersButton).toBeTruthy();

        fireEvent.press(listenersButton);

        await waitFor(() => {
            const usersListScreen = screen.getByText(/users.*list/i);
            expect(usersListScreen).toBeTruthy();
        });

        for (const fakeUser of fakeUsersArray) {
            const userListItem = screen.getByTestId(
                `${fakeUser.nickname}-user-card`,
            );
            expect(userListItem).toBeTruthy();
            expect(within(userListItem).getByText(fakeUser.nickname));

            //Looking for Icons
            if (fakeUser.isCreator) {
                expect(
                    within(userListItem).getByA11yLabel(
                        `${fakeUser.nickname} is the room creator`,
                    ),
                ).toBeTruthy();
            }

            if (fakeUser.isDelegationOwner) {
                expect(
                    within(userListItem).getByA11yLabel(
                        `${fakeUser.nickname} is the delegation owner`,
                    ),
                ).toBeTruthy();
            }

            if (fakeUser.hasControlAndDelegationPermission) {
                expect(
                    within(userListItem).getByA11yLabel(
                        `${fakeUser.nickname} has control and delegation permission`,
                    ),
                ).toBeTruthy();
            }

            if (fakeUser.isMe) {
                expect(within(userListItem).getByText(/\(you\)/i)).toBeTruthy();
            }
            // ///

            //Looking for settings
            const userSettingsThreeDotsButton = within(
                userListItem,
            ).getByA11yLabel(`Open user ${fakeUser.nickname} settings`);
            expect(userSettingsThreeDotsButton).toBeTruthy();

            fireEvent.press(userSettingsThreeDotsButton);

            await waitFor(() => {
                const bottomSheetModalTitle = screen.getByText(
                    new RegExp(`${fakeUser.nickname}.*settings`, 'i'),
                );
                expect(bottomSheetModalTitle).toBeTruthy();
            });

            const makeDelegatorButton = screen.queryByText(
                /.*delegation.*owner.*/i,
            );
            expect(makeDelegatorButton).toBeTruthy();

            if (fakeUser.isCreator) {
                expect(makeDelegatorButton).toBeDisabled();
                expect(
                    screen.queryByA11yLabel(
                        /.*delegation.*control.*permission/i,
                    ),
                ).toBeNull();
            } else {
                if (fakeUser.hasControlAndDelegationPermission) {
                    expect(
                        screen.getByA11yLabel(
                            /Remove.*delegation.*control.*permission/i,
                        ),
                    ).toBeTruthy();
                } else {
                    expect(
                        screen.getByA11yLabel(
                            /set.*delegation.*control.*permission/i,
                        ),
                    ).toBeTruthy();
                }
            }
            // ///
        }
    });

    it(`It should display a user card for each users in the broadcast mtv room
    As the device owner is the creator it should be able to open except for himself
    Where we should find the toggle permission switch`, async () => {
        const tracksList = [generateTrackMetadata(), generateTrackMetadata()];

        const roomCreatorUserID = datatype.uuid();
        const initialState: MtvWorkflowState = {
            name: random.words(),
            roomID: datatype.uuid(),
            playing: false,
            playingMode: MtvPlayingModes.Values.BROADCAST,
            roomCreatorUserID,
            isOpen: true,
            isOpenOnlyInvitedUsersCanVote: false,
            hasTimeAndPositionConstraints: false,
            timeConstraintIsValid: null,
            delegationOwnerUserID: null,
            userRelatedInformation: {
                hasControlAndDelegationPermission: true,
                userFitsPositionConstraint: null,
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

        const fakeUsersArray = getFakeUsersList({
            directMode: false,
            isMeIsCreator: true,
            length: 5,
        });

        serverSocket.on('GET_CONTEXT', () => {
            serverSocket.emit('RETRIEVE_CONTEXT', initialState);
        });

        serverSocket.on('GET_USERS_LIST', (cb) => {
            cb(fakeUsersArray);
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

        const miniPlayerTrackTitle = await within(musicPlayerMini).findByText(
            new RegExp(`${tracksList[0].title}.*${tracksList[0].artistName}`),
        );
        expect(miniPlayerTrackTitle).toBeTruthy();

        fireEvent.press(miniPlayerTrackTitle);

        const musicPlayerFullScreen = await screen.findByA11yState({
            expanded: true,
        });
        expect(musicPlayerFullScreen).toBeTruthy();
        expect(
            within(musicPlayerFullScreen).getByText(tracksList[0].title),
        ).toBeTruthy();

        const listenersButton = await screen.getByText(/listeners/i);
        expect(listenersButton).toBeTruthy();

        fireEvent.press(listenersButton);

        await waitFor(() => {
            const usersListScreen = screen.getByText(/users.*list/i);
            expect(usersListScreen).toBeTruthy();
        });

        for (const fakeUser of fakeUsersArray) {
            const userListItem = screen.getByTestId(
                `${fakeUser.nickname}-user-card`,
            );
            expect(userListItem).toBeTruthy();
            expect(within(userListItem).getByText(fakeUser.nickname));

            //Looking for Icons
            if (fakeUser.isCreator) {
                expect(
                    within(userListItem).getByA11yLabel(
                        `${fakeUser.nickname} is the room creator`,
                    ),
                ).toBeTruthy();
            }

            if (fakeUser.isDelegationOwner) {
                expect(
                    within(userListItem).getByA11yLabel(
                        `${fakeUser.nickname} is the delegation owner`,
                    ),
                ).toBeTruthy();
            }

            if (fakeUser.hasControlAndDelegationPermission) {
                expect(
                    within(userListItem).getByA11yLabel(
                        `${fakeUser.nickname} has control and delegation permission`,
                    ),
                ).toBeTruthy();
            }

            if (fakeUser.isMe) {
                expect(within(userListItem).getByText(/\(you\)/i)).toBeTruthy();
            }
            // ///

            //Looking for settings
            const userSettingsThreeDotsButton = within(
                userListItem,
            ).queryByA11yLabel(`Open user ${fakeUser.nickname} settings`);

            if (fakeUser.isCreator) {
                expect(userSettingsThreeDotsButton).toBeNull();
            } else {
                expect(userSettingsThreeDotsButton).toBeTruthy();
                fireEvent.press(userSettingsThreeDotsButton);

                await waitFor(() => {
                    const bottomSheetModalTitle = screen.getByText(
                        new RegExp(`${fakeUser.nickname}.*settings`, 'i'),
                    );
                    expect(bottomSheetModalTitle).toBeTruthy();
                });

                const makeDelegatorButton = screen.queryByText(
                    /.*delegation.*owner.*/i,
                );
                expect(makeDelegatorButton).toBeNull();

                if (fakeUser.hasControlAndDelegationPermission) {
                    expect(
                        screen.getByA11yLabel(
                            /Remove.*delegation.*control.*permission/i,
                        ),
                    ).toBeTruthy();
                } else {
                    expect(
                        screen.getByA11yLabel(
                            /set.*delegation.*control.*permission/i,
                        ),
                    ).toBeTruthy();
                }
            }
            // ///
        }
    });
});
