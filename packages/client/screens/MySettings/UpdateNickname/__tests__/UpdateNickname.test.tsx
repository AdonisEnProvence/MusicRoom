import { createModel } from 'xstate/lib/model';
import { createModel as createTestModel } from '@xstate/test';
import { EventFrom } from 'xstate';
import Toast from 'react-native-toast-message';
import {
    UpdateNicknameRequestBody,
    UpdateNicknameResponseBody,
} from '@musicroom/types';
import { rest } from 'msw';
import {
    render,
    fireEvent,
    within,
    waitFor,
    testGetFakeUserID,
    renderApp,
} from '../../../../tests/tests-utils';
import { db } from '../../../../tests/data';
import { server } from '../../../../tests/server/test-server';
import { SERVER_ENDPOINT } from '../../../../constants/Endpoints';

interface TestingContext {
    screen: ReturnType<typeof render>;
}

const CURRENT_USER_NICKNAME = 'Biolay';
const UNAVAILABLE_NICKNAME = 'Jean-Louis Murat';
const AVAILABLE_NICKNAME = 'Gaëtan Roussel';

async function withinUpdateNicknameScreen(screen: ReturnType<typeof render>) {
    return within(await screen.findByTestId('update-nickname-screen'));
}

const updateNicknameModel = createModel(
    {},
    {
        events: {
            'Type nickname and submit': (args: { nickname: string }) => args,
        },
    },
);

const updateNicknameMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QFUAOECGAXMACAcgJYDGA1gHYYC2eAKnFrgLID2EYANgMS0CeqeciQrU8GchFywArgCMqhLIlCoWsRYRbllIAB6IAjAYCcAOiMAWAOwmArAA4rtgEwAGAGz2ANCF6IAtLaupkHG7hYOVs4AzMYWHgC+ST7kbHA6aJg4BMKUNLj0sIys7BymAJIQHGA6qupYmtpIegHOBvam0e6e0SbOxsa2tlYWPn4I-s5tpsauFsYG4W2Lrq5WySCZ2HhEZHl0DMxpZeXkAG4YHIQQpgCiVKhYvLhCe6K1ahpaOvoTzva2UzufruNb-VbGEZjRAuUzOGyufoedwGZzuEYWDZbbK7ET5QrFY4Vc6Xa6mADKoheuSpGFguGI0gATkywORGFoas06l8mqBfpMAUCQWD7BCob5DPM4SjZsDXPYLOjgVj0Nscm98YcSpxiRcrjdkJQLoQOBhZNVqZquSpPg1vs0Bf9AcCwqLxaNJQhnEq4S4nP9wrZjNEpqqsjsaVqikdSnrSRAPvVGj8AtFXGZXaComKMxLxpNgjZjIqxVZgQYLAZopiEj5sZHrQVtUSAGoJpO81PeqzmeK9JFrBxuT3jCKA5y2ccWCwxKwjezh9W4-bNmM6jid+18loTaL74VunMe6F7jymeyDKwh2zuaJBDO1pJAA */
    updateNicknameModel.createMachine(
        {
            id: 'Update Nickname Test Model',
            initial: 'Idle',
            states: {
                Idle: {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            const updateNicknameScreen =
                                await withinUpdateNicknameScreen(screen);

                            const alert =
                                updateNicknameScreen.queryByA11yRole('alert');
                            expect(alert).toBeNull();

                            await waitFor(() => {
                                const nicknameInput =
                                    updateNicknameScreen.getByPlaceholderText(
                                        /nickname/i,
                                    );
                                expect(nicknameInput).toBeTruthy();

                                expect(nicknameInput.props.value).toBe(
                                    CURRENT_USER_NICKNAME,
                                );
                            });
                        },
                    },
                },
                Invalid: {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            const updateNicknameScreen =
                                await withinUpdateNicknameScreen(screen);

                            const alert =
                                await updateNicknameScreen.findByA11yRole(
                                    'alert',
                                );
                            expect(alert).toBeTruthy();
                        },
                    },
                    initial: 'Empty nickname',
                    states: {
                        'Empty nickname': {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    const updateNicknameScreen =
                                        await withinUpdateNicknameScreen(
                                            screen,
                                        );

                                    const alert =
                                        await updateNicknameScreen.findByA11yRole(
                                            'alert',
                                        );
                                    expect(alert).toBeTruthy();
                                    expect(alert).toHaveTextContent(
                                        /nickname.*required/i,
                                    );
                                },
                            },
                        },

                        'Same nickname as current one': {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    const updateNicknameScreen =
                                        await withinUpdateNicknameScreen(
                                            screen,
                                        );

                                    const alert =
                                        await updateNicknameScreen.findByA11yRole(
                                            'alert',
                                        );
                                    expect(alert).toBeTruthy();
                                    expect(alert).toHaveTextContent(
                                        /nickname.*not.*changed/i,
                                    );
                                },
                            },
                        },

                        'Unavailable nickname': {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    const updateNicknameScreen =
                                        await withinUpdateNicknameScreen(
                                            screen,
                                        );

                                    const alert =
                                        await updateNicknameScreen.findByA11yRole(
                                            'alert',
                                        );
                                    expect(alert).toBeTruthy();
                                    expect(alert).toHaveTextContent(
                                        /nickname.*unavailable/i,
                                    );
                                },
                            },
                        },
                    },
                },
                Valid: {
                    type: 'final',

                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            await waitFor(() => {
                                expect(Toast.show).toHaveBeenCalledWith({
                                    type: 'success',
                                    text1: 'Nickname updated successfully',
                                });
                            });
                        },
                    },
                },
            },
            on: {
                'Type nickname and submit': [
                    {
                        cond: 'Is empty nickname',
                        target: '#Update Nickname Test Model.Invalid.Empty nickname',
                    },
                    {
                        cond: 'Is same nickname as current one',
                        target: '#Update Nickname Test Model.Invalid.Same nickname as current one',
                    },
                    {
                        cond: 'Is unavailable',
                        target: '#Update Nickname Test Model.Invalid.Unavailable nickname',
                    },
                    {
                        target: '#Update Nickname Test Model.Valid',
                    },
                ],
            },
        },
        {
            guards: {
                'Is empty nickname': (_context, { nickname }) => {
                    const isEmptyNickname = nickname.trim().length === 0;

                    return isEmptyNickname;
                },

                'Is same nickname as current one': (_context, { nickname }) => {
                    const isSameAsCurrentNickname =
                        nickname.trim() === CURRENT_USER_NICKNAME;

                    return isSameAsCurrentNickname;
                },

                'Is unavailable': (_context, { nickname }) => {
                    const isUnavailableNickname =
                        nickname.trim() === UNAVAILABLE_NICKNAME;

                    return isUnavailableNickname;
                },
            },
        },
    );

const updateNicknameTestModel = createTestModel<TestingContext>(
    updateNicknameMachine,
).withEvents({
    'Type nickname and submit': {
        exec: async ({ screen }, e) => {
            const event = e as EventFrom<
                typeof updateNicknameMachine,
                'Type nickname and submit'
            >;

            const updateNicknameScreen = await withinUpdateNicknameScreen(
                screen,
            );

            const nicknameInput =
                await updateNicknameScreen.findByPlaceholderText(/nickname/i);
            expect(nicknameInput).toBeTruthy();

            fireEvent.changeText(nicknameInput, event.nickname);

            const submitButton = updateNicknameScreen.getByText(/submit/i);
            expect(submitButton).toBeTruthy();

            fireEvent.press(submitButton);
        },

        cases: [
            {
                nickname: '',
            },
            {
                nickname: CURRENT_USER_NICKNAME,
            },
            {
                nickname: UNAVAILABLE_NICKNAME,
            },
            {
                nickname: AVAILABLE_NICKNAME,
            },
        ] as Omit<
            EventFrom<typeof updateNicknameMachine, 'Type nickname and submit'>,
            'type'
        >[],
    },
});

describe('Update Nickname', () => {
    const testPlans = updateNicknameTestModel.getSimplePathPlansTo((state) => {
        const isFinalState = state.done === true;

        return isFinalState === true;
    });

    testPlans.forEach((plan) => {
        describe(plan.description, () => {
            plan.paths.forEach((path) => {
                it(path.description, async () => {
                    server.use(
                        rest.post<
                            UpdateNicknameRequestBody,
                            UpdateNicknameResponseBody
                        >(`${SERVER_ENDPOINT}/me/nickname`, (req, res, ctx) => {
                            switch (req.body.nickname) {
                                case CURRENT_USER_NICKNAME: {
                                    return res(
                                        ctx.json({
                                            status: 'SAME_NICKNAME',
                                        }),
                                    );
                                }

                                case UNAVAILABLE_NICKNAME: {
                                    return res(
                                        ctx.json({
                                            status: 'UNAVAILABLE_NICKNAME',
                                        }),
                                    );
                                }

                                default: {
                                    return res(
                                        ctx.json({
                                            status: 'SUCCESS',
                                        }),
                                    );
                                }
                            }
                        }),
                    );

                    const userID = testGetFakeUserID();

                    db.myProfileInformation.create({
                        userID,
                        devicesCounter: 3,
                        playlistsCounter: 4,
                        followersCounter: 5,
                        followingCounter: 6,
                        userNickname: CURRENT_USER_NICKNAME,
                    });

                    const screen = await renderApp();

                    const goToMyProfileButton = await screen.findByLabelText(
                        /open.*my.*profile/i,
                    );
                    expect(goToMyProfileButton).toBeTruthy();

                    fireEvent.press(goToMyProfileButton);

                    const goToMySettingsButton = await waitFor(() => {
                        const button =
                            screen.getByLabelText(/open.*my.*settings/i);
                        expect(button).toBeTruthy();

                        return button;
                    });

                    fireEvent.press(goToMySettingsButton);

                    const goToNicknameSettingsButton = await screen.findByText(
                        /nickname/i,
                    );
                    expect(goToNicknameSettingsButton).toBeTruthy();

                    fireEvent.press(goToNicknameSettingsButton);

                    const updateNicknameScreenHeaderTitle =
                        await screen.findByText(/update.*nickname/i);
                    expect(updateNicknameScreenHeaderTitle).toBeTruthy();

                    await path.test({
                        screen,
                    });

                    // FIXME: When these lines are decommented, an error is thrown telling
                    // that there is no rendered NavigationContainer.
                    //
                    // await waitFor(() => {
                    //     expect(
                    //         screen.queryByTestId('update-nickname-screen'),
                    //     ).toBeNull();
                    // });
                });
            });
        });
    });

    it('should have full coverage', () => {
        updateNicknameTestModel.testCoverage();
    });
});
