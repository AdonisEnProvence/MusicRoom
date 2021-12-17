import { MpeWorkflowState } from '@musicroom/types';
import { serverSocket } from '../../../services/websockets';
import { generateTrackMetadata } from '../../../tests/data';
import { waitFor } from '../../../tests/tests-utils';
import { createMpeRoom } from '../../../tests/tests-mpe-utils';

test('It should merge given state into the involved playlist', async () => {
    const tracks = [generateTrackMetadata(), generateTrackMetadata()];

    const { screen, state } = await createMpeRoom();

    await waitFor(() => {
        const trackCardElements =
            screen.getAllByTestId(/track-card-container/i);
        expect(trackCardElements.length).toBe(state.value.tracks.length);
    });

    const newState: MpeWorkflowState = {
        ...state.value,
        tracks: [...state.value.tracks, ...tracks],
    };
    serverSocket.emit('MPE_TRACKS_LIST_UPDATE', {
        roomID: newState.roomID,
        state: newState,
    });

    await waitFor(() => {
        const trackCardElements =
            screen.getAllByTestId(/track-card-container/i);
        expect(trackCardElements.length).toBe(newState.tracks.length - 1);
    });
});
