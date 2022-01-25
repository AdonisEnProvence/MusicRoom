import { MtvWorkflowState } from '@musicroom/types';
import { datatype, random } from 'faker';
import { serverSocket } from '../services/websockets';
import { db, generateTrackMetadata } from '../tests/data';
import { fireEvent, renderApp, waitFor, within } from '../tests/tests-utils';

test(`Device should still be playing while entering the mtvRoomCreation form while already being in a room`, async () => {
    const fakeTrack = db.searchableTracks.create();
    const tracksList = [generateTrackMetadata(), generateTrackMetadata()];
    const thisDevice = {
        deviceID: datatype.uuid(),
        name: random.word(),
    };
    const userID = datatype.uuid();
    const state: MtvWorkflowState = {
        roomID: datatype.uuid(),
        name: random.word(),
        playing: true,
        usersLength: 1,
        playingMode: 'BROADCAST',
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userFitsPositionConstraint: null,
            userHasBeenInvited: false,
            emittingDeviceID: thisDevice.deviceID,
            userID,
            tracksVotedFor: [],
        },
        currentTrack: {
            ...tracksList[0],
            elapsed: 0,
        },
        tracks: tracksList.slice(1),
        roomCreatorUserID: userID,
        minimumScoreToBePlayed: 1,
    };

    serverSocket.on('GET_CONNECTED_DEVICES_AND_DEVICE_ID', (cb) => {
        cb({
            currDeviceID: thisDevice.deviceID,
            devices: [
                {
                    deviceID: thisDevice.deviceID,
                    name: 'thisDevice',
                },
            ],
        });
    });

    const screen = await renderApp();

    serverSocket.emit('MTV_RETRIEVE_CONTEXT', state);

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerTrackTitle = await within(musicPlayerMini).findByText(
        new RegExp(`${tracksList[0].title}.*${tracksList[0].artistName}`),
    );
    expect(miniPlayerTrackTitle).toBeTruthy();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    expect(
        screen.getByTestId('music-player-playing-device-emitting'),
    ).toBeTruthy();

    //Search steps
    const searchScreenLink = screen.getByText(/^search$/i);
    expect(searchScreenLink).toBeTruthy();

    fireEvent.press(searchScreenLink);

    await waitFor(() =>
        expect(screen.getByText(/search.*track/i)).toBeTruthy(),
    );

    const searchInput = await screen.findByPlaceholderText(/search.*track/i);
    expect(searchInput).toBeTruthy();

    const SEARCH_QUERY = fakeTrack.title.slice(0, 3);

    /**
     * To simulate a real interaction with a text input, we need to:
     * 1. Focus it
     * 2. Change its text
     * 3. Submit the changes
     */
    fireEvent(searchInput, 'focus');
    fireEvent.changeText(searchInput, SEARCH_QUERY);
    fireEvent(searchInput, 'submitEditing');

    const trackResultListItem = await screen.findByText(fakeTrack.title);
    expect(trackResultListItem).toBeTruthy();

    fireEvent.press(trackResultListItem);

    const creationModal = await screen.findByText(/what.*to.*do.*track/i);
    expect(creationModal).toBeTruthy();

    const createMtvRoomButton = screen.getByText(/create.*mtv/i);
    expect(createMtvRoomButton).toBeTruthy();

    fireEvent.press(createMtvRoomButton);

    await waitFor(() => {
        const roomCreationFormFirstStepTitle =
            screen.getByText(/what.*is.*name.*room/i);
        expect(roomCreationFormFirstStepTitle).toBeTruthy();
    });

    expect(
        screen.getByTestId('music-player-playing-device-emitting'),
    ).toBeTruthy();
});

test('Device should stop playing when exiting current room while being in MTV Creation Form', async () => {
    const fakeTrack = db.searchableTracks.create();
    const tracksList = [generateTrackMetadata(), generateTrackMetadata()];
    const thisDevice = {
        deviceID: datatype.uuid(),
        name: random.word(),
    };
    const userID = datatype.uuid();
    let state: MtvWorkflowState | undefined = {
        roomID: datatype.uuid(),
        name: random.word(),
        playing: true,
        usersLength: 1,
        playingMode: 'BROADCAST',
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userFitsPositionConstraint: null,
            userHasBeenInvited: false,
            emittingDeviceID: thisDevice.deviceID,
            userID,
            tracksVotedFor: [],
        },
        currentTrack: {
            ...tracksList[0],
            elapsed: 0,
        },
        tracks: tracksList.slice(1),
        roomCreatorUserID: userID,
        minimumScoreToBePlayed: 1,
    };

    serverSocket.on('GET_CONNECTED_DEVICES_AND_DEVICE_ID', (cb) => {
        cb({
            currDeviceID: thisDevice.deviceID,
            devices: [
                {
                    deviceID: thisDevice.deviceID,
                    name: 'thisDevice',
                },
            ],
        });
    });

    serverSocket.on('MTV_GET_CONTEXT', () => {
        if (state !== undefined) {
            serverSocket.emit('MTV_RETRIEVE_CONTEXT', state);
        }
    });

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerTrackTitle = await within(musicPlayerMini).findByText(
        new RegExp(`${tracksList[0].title}.*${tracksList[0].artistName}`),
    );
    expect(miniPlayerTrackTitle).toBeTruthy();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    expect(
        screen.getByTestId('music-player-playing-device-emitting'),
    ).toBeTruthy();

    //Search steps
    const searchScreenLink = screen.getByText(/^search$/i);
    expect(searchScreenLink).toBeTruthy();

    fireEvent.press(searchScreenLink);

    await waitFor(() =>
        expect(screen.getByText(/search.*track/i)).toBeTruthy(),
    );

    const searchInput = await screen.findByPlaceholderText(/search.*track/i);
    expect(searchInput).toBeTruthy();

    const SEARCH_QUERY = fakeTrack.title.slice(0, 3);

    /**
     * To simulate a real interaction with a text input, we need to:
     * 1. Focus it
     * 2. Change its text
     * 3. Submit the changes
     */
    fireEvent(searchInput, 'focus');
    fireEvent.changeText(searchInput, SEARCH_QUERY);
    fireEvent(searchInput, 'submitEditing');

    const trackResultListItem = await screen.findByText(fakeTrack.title);
    expect(trackResultListItem).toBeTruthy();

    fireEvent.press(trackResultListItem);

    const creationModal = await screen.findByText(/what.*to.*do.*track/i);
    expect(creationModal).toBeTruthy();

    const createMtvRoomButton = screen.getByText(/create.*mtv/i);
    expect(createMtvRoomButton).toBeTruthy();

    fireEvent.press(createMtvRoomButton);

    await waitFor(() => {
        const roomCreationFormFirstStepTitle =
            screen.getByText(/what.*is.*name.*room/i);
        expect(roomCreationFormFirstStepTitle).toBeTruthy();
    });

    // Exit current room.
    state = undefined;
    serverSocket.emit('MTV_LEAVE_ROOM_CALLBACK');

    await waitFor(() => {
        const musicPlayer = screen.queryByTestId(
            'music-player-fullscreen-container',
        );
        expect(musicPlayer).toBeNull();
    });
});

test('Music Player context is not refreshed when exiting MTV Room Creation Form', async () => {
    const fakeTrack = db.searchableTracks.create();
    const tracksList = [generateTrackMetadata(), generateTrackMetadata()];
    const thisDevice = {
        deviceID: datatype.uuid(),
        name: random.word(),
    };
    const userID = datatype.uuid();
    const state: MtvWorkflowState | undefined = {
        roomID: datatype.uuid(),
        name: random.word(),
        playing: true,
        usersLength: 1,
        playingMode: 'BROADCAST',
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userFitsPositionConstraint: null,
            userHasBeenInvited: false,
            emittingDeviceID: thisDevice.deviceID,
            userID,
            tracksVotedFor: [],
        },
        currentTrack: {
            ...tracksList[0],
            elapsed: 0,
        },
        tracks: tracksList.slice(1),
        roomCreatorUserID: userID,
        minimumScoreToBePlayed: 1,
    };

    serverSocket.on('GET_CONNECTED_DEVICES_AND_DEVICE_ID', (cb) => {
        cb({
            currDeviceID: thisDevice.deviceID,
            devices: [
                {
                    deviceID: thisDevice.deviceID,
                    name: 'thisDevice',
                },
            ],
        });
    });

    const mtvGetContextSpy = jest.fn(() => {
        if (state !== undefined) {
            serverSocket.emit('MTV_RETRIEVE_CONTEXT', state);
        }
    });
    serverSocket.on('MTV_GET_CONTEXT', mtvGetContextSpy);

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerTrackTitle = await within(musicPlayerMini).findByText(
        new RegExp(`${tracksList[0].title}.*${tracksList[0].artistName}`),
    );
    expect(miniPlayerTrackTitle).toBeTruthy();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    expect(
        screen.getByTestId('music-player-playing-device-emitting'),
    ).toBeTruthy();

    //Search steps
    const searchScreenLink = screen.getByText(/^search$/i);
    expect(searchScreenLink).toBeTruthy();

    fireEvent.press(searchScreenLink);

    await waitFor(() =>
        expect(screen.getByText(/search.*track/i)).toBeTruthy(),
    );

    const searchInput = await screen.findByPlaceholderText(/search.*track/i);
    expect(searchInput).toBeTruthy();

    const SEARCH_QUERY = fakeTrack.title.slice(0, 3);

    /**
     * To simulate a real interaction with a text input, we need to:
     * 1. Focus it
     * 2. Change its text
     * 3. Submit the changes
     */
    fireEvent(searchInput, 'focus');
    fireEvent.changeText(searchInput, SEARCH_QUERY);
    fireEvent(searchInput, 'submitEditing');

    const trackResultListItem = await screen.findByText(fakeTrack.title);
    expect(trackResultListItem).toBeTruthy();

    fireEvent.press(trackResultListItem);

    const creationModal = await screen.findByText(/what.*to.*do.*track/i);
    expect(creationModal).toBeTruthy();

    const createMtvRoomButton = screen.getByText(/create.*mtv/i);
    expect(createMtvRoomButton).toBeTruthy();

    fireEvent.press(createMtvRoomButton);

    await waitFor(() => {
        const roomCreationFormFirstStepTitle =
            screen.getByText(/what.*is.*name.*room/i);
        expect(roomCreationFormFirstStepTitle).toBeTruthy();
    });

    // Go back
    const backButton = screen.getByText(/back/i);
    expect(backButton).toBeTruthy();

    fireEvent.press(backButton);

    await waitFor(() => {
        const roomCreationFormFirstStepTitle =
            screen.queryByText(/what.*is.*name.*room/i);
        expect(roomCreationFormFirstStepTitle).toBeNull();
    });

    expect(mtvGetContextSpy).toHaveBeenCalledTimes(1);
});
