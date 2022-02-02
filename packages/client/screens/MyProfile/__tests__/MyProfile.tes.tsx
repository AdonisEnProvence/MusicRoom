import { fireEvent, renderApp, waitFor } from '../../../tests/tests-utils';

test('It should display user not found after display unkown user profile page', async () => {
    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const myProfileButton = screen.getByTestId('open-my-profile-page-button');
    expect(myProfileButton).toBeTruthy();

    fireEvent.press(myProfileButton);

    await waitFor(() => {
        expect(screen.getByTestId('my-profile-page-container')).toBeTruthy();
    });
});
