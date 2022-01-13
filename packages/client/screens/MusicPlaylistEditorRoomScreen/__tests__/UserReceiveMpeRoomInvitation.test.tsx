import Toast from 'react-native-toast-message';
import invariant from 'tiny-invariant';
import { serverSocket } from '../../../services/websockets';
import { generateMpeRoomSummary } from '../../../tests/data';
import { renderApp, waitFor } from '../../../tests/tests-utils';

it(`It should display an invitation toast to the user
then press it and emit a MTV_JOIN_ROOM client socket event`, async () => {
    const roomSummary = generateMpeRoomSummary();

    const screen = await renderApp();

    await waitFor(() => {
        expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);
    });

    serverSocket.emit('MPE_RECEIVED_ROOM_INVITATION', { roomSummary });

    let getMpeContextHasBeenCalled = false;
    serverSocket.on('MPE_GET_CONTEXT', ({ roomID }) => {
        getMpeContextHasBeenCalled = true;
        expect(roomID).toEqual(roomSummary.roomID);
    });

    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'info',
            text1: `${roomSummary.creatorName} sent you an invitation`,
            text2: `Press here to see ${roomSummary.roomName} Playlist`,
            onPress: expect.anything(),
            onHide: expect.anything(),
            visibilityTime: 10000,
        });
    });

    const ToastShowMocked = Toast.show as jest.MockedFunction<
        (options: { onPress?: () => void }) => void
    >;
    const call = ToastShowMocked.mock.calls[0][0];

    expect(call.onPress).toBeTruthy();
    invariant(call.onPress !== undefined, 'call.OnPress is undefined');
    call.onPress();

    await waitFor(() => {
        expect(getMpeContextHasBeenCalled).toBeTruthy();
        const playlistTitle = screen.getByText(
            new RegExp(`Playlist.*${roomSummary.roomName}`),
        );
        expect(playlistTitle).toBeTruthy();
    });
});
