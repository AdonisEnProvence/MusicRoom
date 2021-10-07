import {
    MtvPlayingModes,
    MtvRoomUsersListElement,
    MtvWorkflowState,
} from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import { datatype, random } from 'faker';
import React from 'react';
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

describe('User list tests', () => {
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
            expect(
                within(userListItem).getByText(fakeUser.nickname),
            ).toBeTruthy();

            //Looking for Icons
            if (fakeUser.isCreator) {
                expect(
                    within(userListItem).getByA11yLabel(
                        `${fakeUser.nickname} is the room creator`,
                    ),
                ).toBeTruthy();

                expect(
                    within(userListItem).queryByA11yLabel(
                        `${fakeUser.nickname} is the delegation owner`,
                    ),
                ).toBeNull();

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

    it(`It should display a user card for each users in the broadcast mtv room
    As the device owner is not the creator it should not be able to see any users settings three dots button`, async () => {
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
            expect(
                within(userListItem).getByText(fakeUser.nickname),
            ).toBeTruthy();

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
            // ///
        }
    });

    it(`It should display a user card for each users in the broadcast mtv room
    The device owner has the control and delegation permission, he should not be able to see any users settings three dots button`, async () => {
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
            expect(
                within(userListItem).getByText(fakeUser.nickname),
            ).toBeTruthy();

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
            // ///
        }
    });

    it(`It should display a user card for each users in the broadcast mtv room
    As the device owner is the creator he should be able to go to a user settings 
    and give him control and delegation permission the permission icon should appear next
    to the user card`, async () => {
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

        let fakeUsersArray = getFakeUsersList({
            directMode: false,
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
            'UPDATE_CONTROL_AND_DELEGATION_PERMISSION',
            ({ hasControlAndDelegationPermission, toUpdateUserID }) => {
                console.log('RECEIVED UPDATE FOR A USER');
                console.log({
                    hasControlAndDelegationPermission,
                    toUpdateUserID,
                });

                fakeUsersArray = fakeUsersArray.map((fakeUser) =>
                    fakeUser.userID === toUpdateUserID
                        ? {
                              ...fakeUser,
                              hasControlAndDelegationPermission,
                          }
                        : fakeUser,
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
        expect(within(userListItem).getByText(fakeUser.nickname)).toBeTruthy();

        //Looking for settings
        const userSettingsThreeDotsButton = within(
            userListItem,
        ).queryByA11yLabel(`Open user ${fakeUser.nickname} settings`);
        expect(
            within(userListItem).queryByA11yLabel(
                `${fakeUser.nickname} has control and delegation permission`,
            ),
        ).toBeNull();

        expect(userSettingsThreeDotsButton).toBeTruthy();

        fireEvent.press(userSettingsThreeDotsButton);

        await waitFor(() => {
            const bottomSheetModalTitle = screen.getByText(
                new RegExp(`${fakeUser.nickname}.*settings`, 'i'),
            );
            expect(bottomSheetModalTitle).toBeTruthy();
        });

        const permissionButton = screen.queryByA11yLabel(
            /set.*delegation.*control.*permission/i,
        );
        expect(permissionButton).toBeTruthy();

        fireEvent(permissionButton, 'valueChange', true);

        await waitFor(() => {
            expect(
                within(userListItem).getByA11yLabel(
                    `${fakeUser.nickname} has control and delegation permission`,
                ),
            ).toBeTruthy();
        });
        // ///
    });

    it(`It should display a user card for each users in the broadcast mtv room
    After changing the filter input it should display only the users starting with the given search query 
    After a forced refresh with new data inside the search query should still be used`, async () => {
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

        let fakeUsersArray = getFakeUsersList({
            directMode: false,
            isMeIsCreator: true,
        });
        serverSocket.on('GET_CONTEXT', () => {
            console.log('1'.repeat(100));
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

        const searchUserTextField = await screen.findByPlaceholderText(
            /search.*user.*/i,
        );
        expect(searchUserTextField).toBeTruthy();

        const searchedUser = fakeUsersArray[0];
        const searchQuery = searchedUser.nickname.slice(0, 4);
        fireEvent(searchUserTextField, 'focus');
        fireEvent.changeText(searchUserTextField, searchQuery);
        fireEvent(searchUserTextField, 'submitEditing');

        await waitFor(() => {
            const searchedUserCard = screen.getByTestId(
                `${searchedUser.nickname}-user-card`,
            );
            expect(searchedUserCard).toBeTruthy();
            const otherUser = screen.queryByTestId(
                `${fakeUsersArray[1].nickname}-user-card`,
            );
            expect(otherUser).toBeNull();
        });

        const newSearchAbleUser: MtvRoomUsersListElement = {
            hasControlAndDelegationPermission: false,
            isCreator: false,
            isDelegationOwner: false,
            isMe: false,
            nickname: `${searchQuery}_${datatype.uuid()}`,
            userID: datatype.uuid(),
        };
        fakeUsersArray = [...fakeUsersArray, newSearchAbleUser];
        serverSocket.emit('USERS_LIST_FORCED_REFRESH');

        await waitFor(() => {
            const searchedUserCard = screen.getByTestId(
                `${searchedUser.nickname}-user-card`,
            );
            expect(searchedUserCard).toBeTruthy();
            const otherUser = screen.queryByTestId(
                `${fakeUsersArray[1].nickname}-user-card`,
            );
            expect(otherUser).toBeNull();
            const newSearchAbleUserCard = screen.getByTestId(
                `${newSearchAbleUser.nickname}-user-card`,
            );
            expect(newSearchAbleUserCard).toBeTruthy();
        });
    });
});
