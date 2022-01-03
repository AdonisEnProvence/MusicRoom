import Toast from 'react-native-toast-message';
import { serverSocket } from '../../../services/websockets';
import {
    db,
    generateArray,
    generateMpeWorkflowState,
} from '../../../tests/data';
import {
    fireEvent,
    renderApp,
    waitFor,
    within,
    waitForElementToBeRemoved,
} from '../../../tests/tests-utils';

test("It should display join mpe room button as user is previewing a mpe room he hasn't joined, cta should be disabled", async () => {
    const rooms = generateArray({
        minLength: 11,
        maxLength: 15,
        fill: () => db.searchableMpeRooms.create(),
    }).slice(0, 10);
    const firstRoomState = generateMpeWorkflowState({
        ...rooms[0],
        isOpen: true,
        isOpenOnlyInvitedUsersCanEdit: false,
    });

    const screen = await renderApp();

    serverSocket.on('MPE_GET_CONTEXT', ({ roomID }) => {
        expect(roomID).toBe(firstRoomState.roomID);
        serverSocket.emit('MPE_GET_CONTEXT_SUCCESS_CALLBACK', {
            roomID,
            state: firstRoomState,
            userIsNotInRoom: true,
        });
    });

    serverSocket.on('MPE_JOIN_ROOM', ({ roomID }) => {
        serverSocket.emit('MPE_JOIN_ROOM_CALLBACK', {
            roomID,
            state: firstRoomState,
            userIsNotInRoom: false,
        });
    });

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const goToMtvSearchScreenButton = screen.getByText(
        /go.*to.*music.*playlist.*editor/i,
    );
    expect(goToMtvSearchScreenButton).toBeTruthy();

    fireEvent.press(goToMtvSearchScreenButton);

    const searchInput = await screen.findByPlaceholderText(/search.*room/i);
    expect(searchInput).toBeTruthy();

    for (const { roomID, roomName } of rooms) {
        //Should also look for specific room settings icon such as isOpen and why creatorName
        const listItem = await screen.findByTestId(`mpe-room-card-${roomID}`);
        expect(listItem).toBeTruthy();

        const roomNameElement = within(listItem).getByText(
            new RegExp(roomName),
        );
        expect(roomNameElement).toBeTruthy();
    }

    const firstListItem = await screen.findByTestId(
        `mpe-room-card-${firstRoomState.roomID}`,
    );
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

    const joinRoomButton = screen.getByTestId(
        `mpe-join-${firstRoomState.roomID}-absolute-button`,
    );
    expect(joinRoomButton).toBeEnabled();
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
        screen.getByTestId(`mpe-join-${firstRoomState.roomID}-absolute-button`),
    );

    for (const { id: trackID } of firstRoomState.tracks) {
        //Should also look for specific room settings icon such as isOpen and why creatorName
        const listItem = await screen.findByTestId(
            `${trackID}-track-card-container`,
        );
        expect(listItem).toBeTruthy();

        const moveDownTrackButton =
            within(listItem).getByLabelText(/move.*down/i);
        expect(moveDownTrackButton).toBeTruthy();
        expect(moveDownTrackButton).toBeEnabled();

        const moveUpTrackButton = within(listItem).getByLabelText(/move.*up/i);
        expect(moveUpTrackButton).toBeTruthy();
        expect(moveUpTrackButton).toBeEnabled();

        const deleteTrackButton = within(listItem).getByLabelText(/delete/i);
        expect(deleteTrackButton).toBeTruthy();
        expect(deleteTrackButton).toBeEnabled();
    }
});

test('It should display get context fail toast and redirect the user to the mpe search rooms screen', async () => {
    const rooms = generateArray({
        minLength: 11,
        maxLength: 15,
        fill: () => db.searchableMpeRooms.create(),
    }).slice(0, 10);
    const firstRoomState = generateMpeWorkflowState({
        ...rooms[0],
        isOpen: true,
        isOpenOnlyInvitedUsersCanEdit: false,
    });

    const screen = await renderApp();

    serverSocket.on('MPE_GET_CONTEXT', ({ roomID }) => {
        expect(roomID).toBe(firstRoomState.roomID);
        serverSocket.emit('MPE_GET_CONTEXT_FAIL_CALLBACK', {
            roomID,
        });
    });

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const goToMtvSearchScreenButton = screen.getByText(
        /go.*to.*music.*playlist.*editor/i,
    );
    expect(goToMtvSearchScreenButton).toBeTruthy();

    fireEvent.press(goToMtvSearchScreenButton);

    const searchInput = await screen.findByPlaceholderText(/search.*room/i);
    expect(searchInput).toBeTruthy();

    for (const { roomID, roomName } of rooms) {
        //Should also look for specific room settings icon such as isOpen and why creatorName
        const listItem = await screen.findByTestId(`mpe-room-card-${roomID}`);
        expect(listItem).toBeTruthy();

        const roomNameElement = within(listItem).getByText(
            new RegExp(roomName),
        );
        expect(roomNameElement).toBeTruthy();
    }

    const firstListItem = await screen.findByTestId(
        `mpe-room-card-${firstRoomState.roomID}`,
    );
    expect(firstListItem).toBeTruthy();

    fireEvent.press(firstListItem);

    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'error',
            text1: 'Error',
            text2: "Could't not load mpe room",
        });
        const searchInput = screen.getByPlaceholderText(/search.*room/i);
        expect(searchInput).toBeTruthy();
    });

    for (const { roomID, roomName } of rooms) {
        //Should also look for specific room settings icon such as isOpen and why creatorName
        const listItem = await screen.findByTestId(`mpe-room-card-${roomID}`);
        expect(listItem).toBeTruthy();

        const roomNameElement = within(listItem).getByText(
            new RegExp(roomName),
        );
        expect(roomNameElement).toBeTruthy();
    }
});
