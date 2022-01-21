import {
    AllClientToServerEvents,
    MpeChangeTrackOrderOperationToApply,
    MpeWorkflowStateWithUserRelatedInformation,
    PlaylistModelMpeWorkflowState,
} from '@musicroom/types';
import {
    waitForElementToBeRemoved,
    within,
} from '@testing-library/react-native';
import { datatype } from 'faker';
import Toast from 'react-native-toast-message';
import { serverSocket } from '../services/websockets';
import {
    db,
    generateArray,
    generateMpeWorkflowStateWithUserRelatedInformation,
    generateTrackMetadata,
} from './data';
import {
    extractTrackIDFromCardContainerTestID,
    fireEvent,
    render,
    renderApp,
    toTrackCardContainerTestID,
    waitFor,
} from './tests-utils';

export interface DefinedStateRef {
    value: PlaylistModelMpeWorkflowState;
}

//copy pasted from https://stackoverflow.com/questions/19700283/how-to-convert-time-in-milliseconds-to-hours-min-sec-format-in-javascript
export function testUtilsMsToTime(ms: number): string {
    const seconds = ms / 1000;
    const minutes = ms / (1000 * 60);
    const hours = ms / (1000 * 60 * 60);
    const days = ms / (1000 * 60 * 60 * 24);
    if (seconds < 60) return seconds.toFixed(1) + ' Sec';
    else if (minutes < 60) return minutes.toFixed(1) + ' Min';
    else if (hours < 24) return hours.toFixed(1) + ' Hrs';
    else return days.toFixed(1) + ' Days';
}

/**
 * Copy-pasted from https://github.com/AdonisEnProvence/MusicRoom/blob/05409fdb003d7060de8a7314a23d923e6704d398/packages/client/screens/MusicPlaylistEditorListScreen/__tests__/CreateMpeRoom.test.tsx.
 */
export async function createMpeRoom(): Promise<{
    screen: ReturnType<typeof render>;
    state: DefinedStateRef;
}> {
    const track = generateTrackMetadata();
    const roomID = datatype.uuid();
    const creatorUserID = datatype.uuid();
    const mpeRoomState = generateMpeWorkflowStateWithUserRelatedInformation({
        overrides: {
            isOpen: true,
            isOpenOnlyInvitedUsersCanEdit: false,
            roomCreatorUserID: creatorUserID,
            roomID,
            tracks: [track],
            usersLength: 1,
        },
        userID: creatorUserID,
    });
    db.searchableMpeRooms.create({
        roomID: mpeRoomState.roomID,
        isOpen: mpeRoomState.isOpen,
        roomName: mpeRoomState.name,
    });

    const screen = await renderApp();

    expect((await screen.findAllByText(/home/i)).length).toBeGreaterThanOrEqual(
        1,
    );

    const goToLibraryButton = (
        await screen.findAllByTestId(`library-tab`)
    ).slice(-1)[0];
    expect(goToLibraryButton).toBeTruthy();

    serverSocket.emit('MPE_CREATE_ROOM_SYNCED_CALLBACK', mpeRoomState);
    serverSocket.emit('MPE_CREATE_ROOM_CALLBACK', mpeRoomState);

    fireEvent.press(goToLibraryButton);

    await waitFor(() => {
        const libraryScreenTitle = screen.getAllByText(/library/i).slice(-1)[0];
        expect(libraryScreenTitle).toBeTruthy();
    });

    const mpeRoomListItem = await screen.findByText(
        new RegExp(mpeRoomState.name),
    );
    expect(mpeRoomListItem).toBeTruthy();

    fireEvent.press(mpeRoomListItem);

    await waitFor(() => {
        const playlistTitle = screen.getByText(
            new RegExp(`Playlist.*${mpeRoomState.name}`),
        );
        expect(playlistTitle).toBeTruthy();
    });

    await waitFor(() => {
        const expectedPlaylistTotalDuration = testUtilsMsToTime(
            mpeRoomState.playlistTotalDuration,
        );
        expect(screen.getByText(expectedPlaylistTotalDuration)).toBeTruthy();
    });

    return {
        screen,
        state: {
            value: mpeRoomState,
        },
    };
}

export async function addTrack({
    screen,
    trackToAdd,
    state,
}: {
    screen: ReturnType<typeof render>;
    trackToAdd: ReturnType<typeof db['searchableTracks']['create']>;
    state: DefinedStateRef;
}): Promise<void> {
    const addTracksSpy = jest.fn<
        ReturnType<AllClientToServerEvents['MPE_ADD_TRACKS']>,
        Parameters<AllClientToServerEvents['MPE_ADD_TRACKS']>
    >(({ roomID }) => {
        setTimeout(() => {
            state.value = {
                ...state.value,
                tracks: [...state.value.tracks, trackToAdd],
            };

            serverSocket.emit('MPE_ADD_TRACKS_SUCCESS_CALLBACK', {
                roomID,
                state: {
                    ...state.value,
                    userRelatedInformation: null,
                },
            });
        }, 10);
    });
    serverSocket.on('MPE_ADD_TRACKS', addTracksSpy);

    const addTrackButton = await screen.findByText(/add.*track/i);
    expect(addTrackButton).toBeTruthy();

    fireEvent.press(addTrackButton);

    const searchTrackInput = await waitFor(() => {
        const lastSearchTrackInputElement = screen
            .getAllByPlaceholderText(/search.*track/i)
            .slice(-1)[0];
        expect(lastSearchTrackInputElement).toBeTruthy();

        return lastSearchTrackInputElement;
    });

    fireEvent(searchTrackInput, 'focus');
    fireEvent.changeText(searchTrackInput, trackToAdd.title.slice(0, 3));
    fireEvent(searchTrackInput, 'submitEditing');

    const searchedTrackCard = await waitFor(() => {
        const searchedTrackCardElement = screen.getByText(trackToAdd.title);
        expect(searchedTrackCardElement).toBeTruthy();

        return searchedTrackCardElement;
    });

    fireEvent.press(searchedTrackCard);

    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'success',
            text1: expect.any(String),
        });
    });

    await waitFor(() => {
        expect(screen.getByText(/add.*track/i)).not.toBeDisabled();
    });
}

async function playlistUIHasUnfreezed(screen: ReturnType<typeof render>) {
    return await waitFor(() => {
        expect(screen.getByText(/add.*track/i)).not.toBeDisabled();
    });
}

/**
 * Will emit corresponding client socket event to perform a change track order operation
 * Will also check that track has been moved
 * Warning: don't forget to init the serverSocket handlers
 * ShouldFail is an optionnal parameter that allow to fake a failure upper a valid operation
 */
export async function changeTrackOrder({
    screen,
    state,
    trackToMove: { operationToApply, fromIndex },
    shouldFail,
}: {
    state: DefinedStateRef;
    screen: ReturnType<typeof render>;
    trackToMove: {
        fromIndex: number;
        operationToApply: MpeChangeTrackOrderOperationToApply;
    };
    shouldFail?: boolean;
}): Promise<void> {
    const destIndex =
        fromIndex +
        (operationToApply === MpeChangeTrackOrderOperationToApply.Values.DOWN
            ? 1
            : -1);

    /**
     * Using waitFor and playlistUIHasUnfreezed to prevent any calling test context issue
     */
    const trackCardElements = screen.getAllByTestId(/track-card-container/i);
    expect(trackCardElements.length).toBe(state.value.tracks.length);

    const tracksIDs = trackCardElements.map(({ props: { testID } }) =>
        extractTrackIDFromCardContainerTestID(testID),
    );

    await playlistUIHasUnfreezed(screen);

    expect(fromIndex < state.value.tracks.length).toBeTruthy();

    const moveDownTrackButton = within(
        trackCardElements[fromIndex],
    ).getByLabelText(/move.*down/i);
    expect(moveDownTrackButton).toBeTruthy();

    const moveUpTrackButton = within(
        trackCardElements[fromIndex],
    ).getByLabelText(/move.*up/i);
    expect(moveUpTrackButton).toBeTruthy();

    const trackToMoveIsFirstTrack = fromIndex === 0;
    const trackToMoveIsLastTrack = fromIndex === state.value.tracks.length - 1;
    if (trackToMoveIsFirstTrack) {
        expect(moveUpTrackButton).toBeDisabled();
        expect(moveDownTrackButton).not.toBeDisabled();
    } else if (trackToMoveIsLastTrack) {
        expect(moveUpTrackButton).not.toBeDisabled();
        expect(moveDownTrackButton).toBeDisabled();
    } else {
        expect(moveUpTrackButton).not.toBeDisabled();
        expect(moveDownTrackButton).not.toBeDisabled();
    }

    if (operationToApply === MpeChangeTrackOrderOperationToApply.Values.DOWN) {
        fireEvent.press(moveDownTrackButton);
    } else {
        fireEvent.press(moveUpTrackButton);
    }

    if (!shouldFail) {
        await waitFor(() => {
            const trackCardElements =
                screen.getAllByTestId(/track-card-container/i);
            expect(trackCardElements.length).toBe(state.value.tracks.length);

            /**
             * Tracks have been swapped
             */
            expect(trackCardElements[fromIndex]).toHaveProp(
                'testID',
                toTrackCardContainerTestID(tracksIDs[destIndex]),
            );
            expect(trackCardElements[destIndex]).toHaveProp(
                'testID',
                toTrackCardContainerTestID(tracksIDs[fromIndex]),
            );
        });

        await playlistUIHasUnfreezed(screen);
    }
}

/**
 * This method will make the user join the first mocked room he will find
 * After this method the user will be on the mpe room view
 */
export async function joinMpeRoom(
    overrides?: Partial<MpeWorkflowStateWithUserRelatedInformation>,
): Promise<{
    screen: ReturnType<typeof render>;
    state: DefinedStateRef;
}> {
    const rooms = generateArray({
        minLength: 11,
        maxLength: 15,
        fill: () => db.searchableMpeRooms.create(),
    }).slice(0, 10);
    const firstRoomState = generateMpeWorkflowStateWithUserRelatedInformation({
        overrides: {
            ...rooms[0],
            isOpen: true,
            isOpenOnlyInvitedUsersCanEdit: false,
            ...overrides,
        },
        //Is this a real game changer ?
        userID: datatype.uuid(),
    });

    const screen = await renderApp();

    let tmp = false;
    serverSocket.on('MPE_GET_CONTEXT', ({ roomID }) => {
        expect(roomID).toBe(firstRoomState.roomID);
        serverSocket.emit('MPE_GET_CONTEXT_SUCCESS_CALLBACK', {
            roomID,
            state: firstRoomState,
            userIsNotInRoom: true,
        });
    });

    serverSocket.on('MPE_JOIN_ROOM', ({ roomID }) => {
        console.log('JOIN_ROOM_IS_CALLED');
        serverSocket.emit('MPE_JOIN_ROOM_CALLBACK', {
            roomID,
            state: firstRoomState,
            userIsNotInRoom: false,
        });

        tmp = true;
    });

    const onlyInvitedUsersCanEditAndUserIsNotInvited =
        firstRoomState.isOpen &&
        firstRoomState.isOpenOnlyInvitedUsersCanEdit &&
        !firstRoomState.userRelatedInformation.userHasBeenInvited;
    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const goToMtvSearchScreenButton = screen.getByText(
        /go.*to.*music.*playlist.*editor/i,
    );
    expect(goToMtvSearchScreenButton).toBeTruthy();

    fireEvent.press(goToMtvSearchScreenButton);

    const searchInput = (
        await screen.findAllByPlaceholderText(/search.*room/i)
    ).slice(-1)[0];
    expect(searchInput).toBeTruthy();

    for (const { roomID, roomName } of rooms) {
        //Should also look for specific room settings icon such as isOpen and why creatorName
        const listItem = (
            await screen.findAllByTestId(`mpe-room-card-${roomID}`)
        ).slice(-1)[0];
        expect(listItem).toBeTruthy();

        const roomNameElement = within(listItem).getByText(
            new RegExp(roomName),
        );
        expect(roomNameElement).toBeTruthy();
    }

    const firstListItem = (
        await screen.findAllByTestId(`mpe-room-card-${firstRoomState.roomID}`)
    ).slice(-1)[0];
    expect(firstListItem).toBeTruthy();

    fireEvent.press(firstListItem);

    await waitFor(() => {
        const [libraryScreenTitle] = screen.getAllByText(/library/i);
        expect(
            screen.getAllByText(
                new RegExp(`${firstRoomState.tracks.length} Tracks`),
            ),
        ).toBeTruthy();
        expect(libraryScreenTitle).toBeTruthy();
    });

    await waitFor(() => {
        const expectedPlaylistTotalDuration = testUtilsMsToTime(
            firstRoomState.playlistTotalDuration,
        );
        expect(screen.getByText(expectedPlaylistTotalDuration)).toBeTruthy();
    });

    const joinRoomButton = screen.getByTestId(
        `mpe-join-${firstRoomState.roomID}-absolute-button`,
    );
    expect(joinRoomButton).not.toBeDisabled();
    expect(joinRoomButton).toBeTruthy();

    for (const { id: trackID } of firstRoomState.tracks) {
        //Should also look for specific room settings icon such as isOpen and why creatorName
        const listItem = await screen.findByTestId(
            `${trackID}-track-card-container`,
        );
        expect(listItem).toBeTruthy();

        const moveDownTrackButton =
            within(listItem).getByLabelText(/move.*down/i);
        expect(moveDownTrackButton).toBeTruthy();
        expect(moveDownTrackButton).toBeDisabled();

        const moveUpTrackButton = within(listItem).getByLabelText(/move.*up/i);
        expect(moveUpTrackButton).toBeTruthy();
        expect(moveUpTrackButton).toBeDisabled();

        const deleteTrackButton = within(listItem).getByLabelText(/delete/i);
        expect(deleteTrackButton).toBeTruthy();
        expect(deleteTrackButton).toBeDisabled();
    }

    fireEvent.press(joinRoomButton);

    await waitForElementToBeRemoved(() =>
        screen.queryByTestId(
            `mpe-join-${firstRoomState.roomID}-absolute-button`,
        ),
    );

    if (!onlyInvitedUsersCanEditAndUserIsNotInvited) {
        await playlistUIHasUnfreezed(screen);
    }

    for (const [index, { id: trackID }] of firstRoomState.tracks.entries()) {
        const isFirstElement = index === 0;
        const isLastTrack = index === firstRoomState.tracks.length - 1;

        await waitFor(() => {
            expect(tmp).toBeTruthy();
        });

        const listItem = await screen.findByTestId(
            `${trackID}-track-card-container`,
        );
        expect(listItem).toBeTruthy();

        //Playlist edit operation cta
        const moveDownTrackButton =
            within(listItem).getByLabelText(/move.*down/i);
        expect(moveDownTrackButton).toBeTruthy();
        const moveUpTrackButton = within(listItem).getByLabelText(/move.*up/i);
        expect(moveUpTrackButton).toBeTruthy();
        const deleteTrackButton = within(listItem).getByLabelText(/delete/i);
        expect(deleteTrackButton).toBeTruthy();

        if (onlyInvitedUsersCanEditAndUserIsNotInvited) {
            expect(moveDownTrackButton).toBeDisabled();
            expect(moveUpTrackButton).toBeDisabled();
            expect(deleteTrackButton).toBeDisabled();
        } else {
            if (isLastTrack) {
                expect(moveDownTrackButton).toBeDisabled();
            } else {
                expect(moveDownTrackButton).not.toBeDisabled();
            }

            if (isFirstElement) {
                expect(moveUpTrackButton).toBeDisabled();
            } else {
                expect(moveUpTrackButton).not.toBeDisabled();
            }

            expect(deleteTrackButton).not.toBeDisabled();
        }

        //Always enabled cta
        await waitFor(() => {
            const exportAsMtvButton = screen.getByText(/.*export.*/i);
            expect(exportAsMtvButton).toBeTruthy();
            expect(exportAsMtvButton).not.toBeDisabled();
            const leaveRoomButton = screen.getByText(/.*leave.*/i);
            expect(leaveRoomButton).toBeTruthy();
            expect(leaveRoomButton).not.toBeDisabled();
        });
    }

    return {
        screen,
        state: {
            value: firstRoomState,
        },
    };
}
