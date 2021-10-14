import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import Toast from 'react-native-toast-message';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { generateMtvRoomSummary } from '../tests/data';
import { noop, render, waitFor, waitForTimeout } from '../tests/tests-utils';

it(`It should hide control button ( play or pause and go to next track )
if the user doesn't have the control and delegation permission`, async () => {
    const mtvRoomSummary = generateMtvRoomSummary();

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
    await waitForTimeout(1000);

    serverSocket.emit('RECEIVED_MTV_ROOM_INVITATION', mtvRoomSummary);

    let joinRoomServerListernerHasBeenCalled = false;
    serverSocket.on('JOIN_ROOM', ({ roomID }) => {
        joinRoomServerListernerHasBeenCalled = true;
        expect(roomID).toEqual(mtvRoomSummary.roomID);
    });

    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'info',
            text1: `${mtvRoomSummary.creatorName} sent you an invitation !`,
            text2: `TAP ON ME to join ${mtvRoomSummary.roomName} Music Track Vote room`,
            onPress: expect.anything(),
        });
    });

    const ToastShowMocked = Toast.show as jest.MockedFunction<
        (options: { onPress?: () => void }) => void
    >;
    const call = ToastShowMocked.mock.calls[0][0];

    expect(call.onPress).toBeTruthy();
    if (call.onPress == null) {
        throw new Error('call.OnPress is null');
    }
    console.log(call.onPress.toString());
    call.onPress();

    await waitFor(() => {
        expect(joinRoomServerListernerHasBeenCalled).toBeTruthy();
    });
});
