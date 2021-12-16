import Toast from 'react-native-toast-message';
import { serverSocket } from '../../../services/websockets';
import { createMpeRoom } from '../../../tests/tests-mpe-utils';
import {
    fireEvent,
    waitFor,
    within,
    waitForElementToBeRemoved,
    toTrackCardContainerTestID,
} from '../../../tests/tests-utils';

test('Delete track and trigger sucess toast', async () => {
    const { screen, state } = await createMpeRoom();
    const trackAlreadyInPlaylist = state.value.tracks[0];

    serverSocket.on('MPE_DELETE_TRACKS', ({ tracksIDs }) => {
        setImmediate(() => {
            state.value = {
                ...state.value,
                tracks: state.value.tracks.filter((track) => {
                    const shouldDeleteTrack = tracksIDs.some(
                        (id) => id === track.id,
                    );
                    const shouldKeepEntry = shouldDeleteTrack === false;

                    return shouldKeepEntry;
                }),
            };

            serverSocket.emit('MPE_DELETE_TRACKS_SUCCESS_CALLBACK', {
                roomID: state.value.roomID,
                state: state.value,
            });
        });
    });

    const trackCard = await waitFor(() => {
        const trackCardElement = screen.getByTestId(
            toTrackCardContainerTestID(trackAlreadyInPlaylist.id),
        );
        expect(trackCardElement).toBeTruthy();

        return trackCardElement;
    });

    const deleteTrackButton = within(trackCard).getByLabelText(/delete/i);
    expect(deleteTrackButton).toBeTruthy();

    const waitForTrackCardElementToDisappearPromise = waitForElementToBeRemoved(
        () => screen.getByText(trackAlreadyInPlaylist.title),
    );

    fireEvent.press(deleteTrackButton);

    await Promise.all([
        waitForTrackCardElementToDisappearPromise,

        waitFor(() => {
            expect(Toast.show).toHaveBeenNthCalledWith(1, {
                type: 'success',
                text1: expect.any(String),
            });
        }),
    ]);
});
