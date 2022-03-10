import React from 'react';
import Navigation from '../navigation';
import { serverSocket } from '../services/websockets';
import { authenticateUser, noop, render, waitFor } from '../tests/tests-utils';

//This test should no be using the renderApp method as it's checking if loading is well displayed
test(`It should display the splash until the server answer the acknowledge connection polling`, async () => {
    await authenticateUser();

    const screen = render(
        <Navigation colorScheme="dark" toggleColorScheme={noop} />,
    );

    expect(screen.getAllByText(/Loading/i)).toBeTruthy();

    const getHasAcknowledgedConnectionSpy = jest.fn((cb) => cb());
    serverSocket.on(
        'GET_HAS_ACKNOWLEDGED_CONNECTION',
        getHasAcknowledgedConnectionSpy,
    );

    await waitFor(() => {
        expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);
    });

    expect(getHasAcknowledgedConnectionSpy).toHaveBeenCalled();
});
