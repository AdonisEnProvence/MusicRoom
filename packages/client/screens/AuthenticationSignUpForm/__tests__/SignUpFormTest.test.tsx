import { internet, random } from 'faker';
import Toast from 'react-native-toast-message';
import { db } from '../../../tests/data';
import {
    fireEvent,
    renderApp,
    waitFor,
    Queries,
    within,
    generateStrongPassword,
    generateWeakPassword,
    renderUnauthenticatedApp,
} from '../../../tests/tests-utils';

test('It sign up selected user credentials', async () => {
    const userNickname = internet.userName();
    const email = internet.email();
    const password = generateStrongPassword();

    const screen = await renderUnauthenticatedApp();

    const goToSignUpFormButton = await screen.findByText(/.*or.*sign.*up.*/i);
    expect(goToSignUpFormButton).toBeTruthy();

    fireEvent.press(goToSignUpFormButton);

    const signUpFormScreenContainer = await waitFor(() => {
        const tmp = screen.getByTestId('sign-up-form-screen-container');
        expect(tmp).toBeTruthy();
        return tmp;
    });

    const withinSignUpFormScreenContainer = (): Queries =>
        within(signUpFormScreenContainer);

    //fill username
    const userNameTextField = withinSignUpFormScreenContainer().getByTestId(
        'sign-up-nickname-text-field',
    );
    expect(userNameTextField).toBeTruthy();
    fireEvent.changeText(userNameTextField, userNickname);

    //fill email
    const emailTextField = withinSignUpFormScreenContainer().getByTestId(
        'sign-up-email-text-field',
    );
    expect(emailTextField).toBeTruthy();
    fireEvent.changeText(emailTextField, email);

    //fill password
    const passwordTextField = withinSignUpFormScreenContainer().getByTestId(
        'sign-up-password-text-field',
    );
    expect(passwordTextField).toBeTruthy();
    fireEvent.changeText(passwordTextField, password);

    //submit
    const submitSignUpFormButton =
        withinSignUpFormScreenContainer().getByTestId(
            'submit-sign-up-form-button',
        );
    expect(submitSignUpFormButton).toBeTruthy();
    fireEvent.press(submitSignUpFormButton);

    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'success',
            text1: 'Signed up successfully',
        });
    });
});

test('It should fail to sign up selected user credentials', async () => {
    const email = internet.email().replace('@', random.word());
    const password = generateWeakPassword();

    const screen = await renderUnauthenticatedApp();

    const goToSignUpFormButton = await screen.findByText(/.*or.*sign.*up.*/i);
    expect(goToSignUpFormButton).toBeTruthy();

    fireEvent.press(goToSignUpFormButton);

    const signUpFormScreenContainer = await waitFor(() => {
        const tmp = screen.getByTestId('sign-up-form-screen-container');
        expect(tmp).toBeTruthy();
        return tmp;
    });

    const withinSignUpFormScreenContainer = (): Queries =>
        within(signUpFormScreenContainer);

    //don't fill username

    //fill email
    const emailTextField = withinSignUpFormScreenContainer().getByTestId(
        'sign-up-email-text-field',
    );
    expect(emailTextField).toBeTruthy();
    fireEvent.changeText(emailTextField, email);

    //fill password
    const passwordTextField = withinSignUpFormScreenContainer().getByTestId(
        'sign-up-password-text-field',
    );
    expect(passwordTextField).toBeTruthy();
    fireEvent.changeText(passwordTextField, password);

    //submit
    const submitSignUpFormButton =
        withinSignUpFormScreenContainer().getByTestId(
            'submit-sign-up-form-button',
        );
    expect(submitSignUpFormButton).toBeTruthy();
    fireEvent.press(submitSignUpFormButton);

    await waitFor(() => {
        expect(
            withinSignUpFormScreenContainer().getByText(
                /.*email.*not.*valid.*/i,
            ),
        ).toBeTruthy();
        expect(
            withinSignUpFormScreenContainer().getByText(/.*password.*weak.*/i),
        ).toBeTruthy();
        expect(
            withinSignUpFormScreenContainer().getByText(/.*field.*required.*/i),
        ).toBeTruthy();
    });
});
