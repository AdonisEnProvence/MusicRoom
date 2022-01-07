import { MpeRoomSummary } from '@musicroom/types';
import Toast from 'react-native-toast-message';
import { serverSocket } from '../../../services/websockets';
import { joinMpeRoom } from '../../../tests/tests-mpe-utils';
import { fireEvent, waitFor } from '../../../tests/tests-utils';

test('It should join then leave the mpe room user should be redirected', async () => {
    const { screen, state } = await joinMpeRoom();

    serverSocket.on('MPE_LEAVE_ROOM', () => {
        const roomSummary: MpeRoomSummary = {
            creatorName: '',
            isInvited: false,
            isOpen: true,
            roomID: state.value.roomID,
            //only name matters here
            roomName: state.value.name,
        };
        serverSocket.emit('MPE_LEAVE_ROOM_CALLBACK', {
            roomSummary,
        });
    });

    const leaveRoomButton = screen.getByText(/Leave room/i);
    expect(leaveRoomButton).toBeTruthy();
    expect(leaveRoomButton).not.toBeDisabled();

    fireEvent.press(leaveRoomButton);

    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'success',
            text1: `Leaving ${state.value.name} is a success`,
        });

        expect(screen.getByText(/your library/i)).toBeTruthy();
    });
});

test('It should join then leave the mpe room user should not be redirected', async () => {
    const { screen, state } = await joinMpeRoom();

    //Going to the home
    const goBackButtons = screen.getAllByA11yLabel(/Go back/i);
    const lastGoBackButton = goBackButtons[goBackButtons.length - 1];
    expect(lastGoBackButton).toBeTruthy();

    fireEvent.press(lastGoBackButton);

    await waitFor(() => {
        const goToMtvSearchScreenButton = screen.getByText(
            /go.*to.*music.*playlist.*editor/i,
        );
        expect(goToMtvSearchScreenButton).toBeTruthy();
    });

    //Emitting leave as if it was from an other device
    const roomSummary: MpeRoomSummary = {
        creatorName: '',
        isInvited: false,
        isOpen: true,
        roomID: state.value.roomID,
        //only name matters here
        roomName: state.value.name,
    };
    serverSocket.emit('MPE_LEAVE_ROOM_CALLBACK', {
        roomSummary,
    });

    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'success',
            text1: `Leaving ${state.value.name} is a success`,
        });

        const goToMtvSearchScreenButton = screen.getByText(
            /go.*to.*music.*playlist.*editor/i,
        );
        expect(goToMtvSearchScreenButton).toBeTruthy();
    });
});

test('It should join then forced leave the mpe room user should be redirected', async () => {
    const { screen, state } = await joinMpeRoom();

    const roomSummary: MpeRoomSummary = {
        creatorName: '',
        isInvited: false,
        isOpen: true,
        roomID: state.value.roomID,
        //only name matters here
        roomName: state.value.name,
    };
    serverSocket.emit('MPE_FORCED_DISCONNECTION', {
        roomSummary,
    });

    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'error',
            text1: `${state.value.name} creator has quit`,
            text2: `forced disconnection`,
        });

        expect(screen.getByText(/your library/i)).toBeTruthy();
    });
});

test('It should join then forced leave the mpe room user should not be redirected', async () => {
    const { screen, state } = await joinMpeRoom();

    //Going to the home
    const goBackButtons = screen.getAllByA11yLabel(/Go back/i);
    const lastGoBackButton = goBackButtons[goBackButtons.length - 1];
    expect(lastGoBackButton).toBeTruthy();

    fireEvent.press(lastGoBackButton);

    await waitFor(() => {
        const goToMtvSearchScreenButton = screen.getByText(
            /go.*to.*music.*playlist.*editor/i,
        );
        expect(goToMtvSearchScreenButton).toBeTruthy();
    });

    //Emitting leave as if it was from an other device
    const roomSummary: MpeRoomSummary = {
        creatorName: '',
        isInvited: false,
        isOpen: true,
        roomID: state.value.roomID,
        //only name matters here
        roomName: state.value.name,
    };
    serverSocket.emit('MPE_FORCED_DISCONNECTION', {
        roomSummary,
    });

    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'error',
            text1: `${state.value.name} creator has quit`,
            text2: `forced disconnection`,
        });

        const goToMtvSearchScreenButton = screen.getByText(
            /go.*to.*music.*playlist.*editor/i,
        );
        expect(goToMtvSearchScreenButton).toBeTruthy();
    });
});
