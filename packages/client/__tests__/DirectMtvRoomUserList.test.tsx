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
    waitForTimeout,
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

                expect(
                    within(userListItem).getByA11yLabel(
                        `${fakeUser.nickname} is the delegation owner`,
                    ),
                ).toBeTruthy();

                expect(within(userListItem).getByText(/\(you\)/i)).toBeTruthy();
            }

            if (fakeUser.hasControlAndDelegationPermission) {
                expect(
                    within(userListItem).getByA11yLabel(
                        `${fakeUser.nickname} has control and delegation permission`,
                    ),
                ).toBeTruthy();
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

    it(`It should display a user card for each users in the direct mtv room
    As the device owner is not the creator it should not be able to see any three dots point settings`, async () => {
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
            isMeIsCreator: false,
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
            expect(userSettingsThreeDotsButton).toBeNull();
        }
    });

    it(`It should display a user card for each users in the direct mtv room
    As the device owner is not the creator but has the control and delegation pemrission
    it should be able to go to every user's settings
    where it should find the set as delegation owner button`, async () => {
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
            isMeIsCreator: false,
        }).map((fakeUser) =>
            fakeUser.isMe
                ? {
                      ...fakeUser,
                      hasControlAndDelegationPermission: true,
                  }
                : fakeUser,
        );

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

            expect(
                screen.queryByA11yLabel(/.*delegation.*control.*permission/i),
            ).toBeNull();

            if (fakeUser.isCreator) {
                expect(makeDelegatorButton).toBeDisabled();
            }
            // ///
        }
    });

    it(`It should display a user card for each users in the direct mtv room
    As the device owner is the creator he should be able to go to a user settings and set him as delegation owner
    the the creator delegation button should not be disabled anymore`, async () => {
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

        let fakeUsersArray = getFakeUsersList({
            directMode: true,
            isMeIsCreator: true,
        });

        serverSocket.on('GET_CONTEXT', () => {
            serverSocket.emit('RETRIEVE_CONTEXT', initialState);
        });

        serverSocket.on('GET_USERS_LIST', (cb) => {
            console.log('GET USERS LIST CALLED');
            console.log(fakeUsersArray);
            cb(fakeUsersArray);
        });

        serverSocket.on(
            'UPDATE_DELEGATION_OWNER',
            ({ newDelegationOwnerUserID }) => {
                initialState.delegationOwnerUserID = newDelegationOwnerUserID;
                fakeUsersArray = fakeUsersArray.map((fakeUser) =>
                    fakeUser.userID === newDelegationOwnerUserID
                        ? {
                              ...fakeUser,
                              isDelegationOwner: true,
                          }
                        : {
                              ...fakeUser,
                              isDelegationOwner: false,
                          },
                );
                serverSocket.emit(
                    'UPDATE_DELEGATION_OWNER_CALLBACK',
                    initialState,
                );
                serverSocket.emit('USERS_LIST_FORCED_REFRESH');
            },
        );

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

        const fakeUser = fakeUsersArray[1];
        const userListItem = screen.getByTestId(
            `${fakeUser.nickname}-user-card`,
        );
        expect(userListItem).toBeTruthy();
        expect(within(userListItem).getByText(fakeUser.nickname));

        //Looking for settings
        const userSettingsThreeDotsButton = within(
            userListItem,
        ).queryByA11yLabel(`Open user ${fakeUser.nickname} settings`);
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

        fireEvent.press(makeDelegatorButton);
        await waitForTimeout(1000);

        expect(makeDelegatorButton).toBeTruthy();
        expect(makeDelegatorButton).toBeDisabled();

        expect(
            within(userListItem).getByA11yLabel(
                `${fakeUser.nickname} is the delegation owner`,
            ),
        ).toBeTruthy();
        // ///

        //Checking for creator set as delegation owner button
        const creator = fakeUsersArray[0];
        const creatorItem = screen.getByTestId(`${creator.nickname}-user-card`);
        expect(creatorItem).toBeTruthy();
        expect(within(creatorItem).getByText(creator.nickname));

        const creatorSettingsThreeDotsButton = within(
            creatorItem,
        ).queryByA11yLabel(`Open user ${creator.nickname} settings`);
        expect(creator).toBeTruthy();

        fireEvent.press(creatorSettingsThreeDotsButton);

        await waitForTimeout(1000);

        expect(makeDelegatorButton).toBeTruthy();
        expect(makeDelegatorButton).not.toBeDisabled();
        // ///
    });
});
