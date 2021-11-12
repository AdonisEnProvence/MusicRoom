import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { RootNavigator } from '../navigation';
import { serverSocket, cleanup } from '../services/websockets';
import { render, waitFor, noop } from '../tests/tests-utils';

test(`It should display the splash until the server answer the acknowledge connection polling`, async () => {
    cleanup();
    let callbackHasBeenCalled = false;
    const screen = render(
        <NavigationContainer>
            <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
        </NavigationContainer>,
    );

    expect(screen.getAllByText(/Loading/i)).toBeTruthy();

    serverSocket.on('GET_HAS_ACKNOWLEDGED_CONNECTION', (cb) => {
        cb();
        callbackHasBeenCalled = true;
    });

    await waitFor(() => {
        expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);
    });
});
