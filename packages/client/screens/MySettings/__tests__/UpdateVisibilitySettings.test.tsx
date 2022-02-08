import { UserSettingVisibility } from '@musicroom/types';
import { createModel } from 'xstate/lib/model';
import { createModel as createTestModel } from '@xstate/test';
import { EventFrom } from 'xstate';
import cases from 'jest-in-case';
import Toast from 'react-native-toast-message';
import { getCurrentPositionAsync, LocationObject } from 'expo-location';
import { datatype, internet } from 'faker';
import {
    fireEvent,
    render,
    renderApp,
    within,
    waitFor,
    testGetFakeUserID,
} from '../../../tests/tests-utils';
import { db } from '../../../tests/data';

interface TestingContext {
    screen: ReturnType<typeof render>;
}

const updateVisibilitySettingsModel = createModel(
    {},
    {
        events: {
            'Update Playlists Visibility': (args: {
                visibility: UserSettingVisibility;
            }) => args,

            'Update Relations Visibility': (args: {
                visibility: UserSettingVisibility;
            }) => args,
        },
    },
);

const updateVisibilitySettingsMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QFUAOECGAXMACAagJayEBGhANoVgJ64DKYWWhAdlLAHQAKFGNVWFi7cArqSoBjAMRpMOXL36DhBYmUrUaiUKgD2JFntY6QAD0QA2AEwBWTgAYHATluWAjLYAcbgCwPbABoQbQR3T2tOL2drBwB2AGZLD3cPawBfdOC5bDwiEnIqWgYmFnYRPgFiYU4AMT0KCj0AdzAAJ1hcAHlWChpZdFzFSpVO-I0i0N0DakJjUwsEa0tfTgTfW3cvL2SNhLjfBODQ7ctHd2sYhKd120zswYVxwq0S5jYOHhHqkTbCADdcgN5HglFUhGN1C9aKZ9IY5iYkOYrHZHC43J4fCsAsdEDszrZfCtrAkSZZSbYEvcQDknlDNMVGO9ypwAEpgPhGVgicRSYFDdmchGQgoMqYgOGzeZIxbkhKcOJeAKWVzrUmWOK4sJeImcWLuOIuawk2zOBxeam0vL0yZvMqfQXYYV1BpNVodbq9fpW3COrkiiZaWEzLkLRDLVa3Lb4vYHI4hRCeOLONbGyxKlzRfaWx7W0W2pn2rh+53cP6AnD8hQl4wB6HiyWhmVWBLyxXK1WHZaahNhWymqL9rxJ9UJbY5kFqfOvQsfLgAETA-0IkjgPF5K6reEXy9XdbFwfh0tAstRFzi7iJRMx2y1GxT3msvl87jH6xc7gnQ2eYrtc84O4rmu9SNC07SdD0fRbrggF7lOgYwkijYImGSwrGsGzRrslJxlq7gxAqDjrAcyRxDYFJfnS06MqU-6wWuZYAkCPr0fukyHlKiInii9jnpeKweN4t69ga8pks4Fy+BJ5LhFS1KsHoEBwKYPo-gWtEsmCozrhIK4cU23EIFJkRjtsr4Gj4r5BL2zg7JwmzXEO-aKv2lF5ghdCzpp3wQi6oHuhBXr6ShzYIHE1harZBKvgE3jOT4dxZDSubwfWf7ecoPw8OWuTBceyIID48oBKSdibLYcbWaEtkpg4MVORVPi+G5qW-l5nxaT8eVcQVvheFqybuJwMSKhsGwHJscQtWpM4aQ6HJOrWOlSN1qG2HVnCeLZ1jhNYF7OM4lh4RqKZeMabi2ZZFXTTas3MvNQpLSBbrgZ6fSraF4XHcmUTnSq2zlVNSWqbdNH3cWC3+tlTE4B9hleIa9muOETjLA4yzuMdZ2pss61mvtbg3dRnlzRDj3cnDvX9SJfX2CSBzDnVl0XETHnpZ8rHLXpSEhiFhnGfZDhylm6MXhsWqXGJRF9Ycz5uCSrNpe1C5LkBXDPWBHqQQ2vP5YsX29pLerSzq6wbORittaTAGq3u0MVmAlOLEVerbKS1wOL4BzxBLriEQkthPgl3ipJb6ngzbu7KTzR49YsfWRV4nAeDq8sbMO-aJQ8k4zWDRZO+GvgS-KB2l2XZc7JkmRAA */
    updateVisibilitySettingsModel.createMachine(
        {
            id: 'Update Visibility Settings',
            type: 'parallel',
            states: {
                Playlists: {
                    initial: 'Public',
                    states: {
                        Public: {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    const playlistsVisibilitySettingRadioGroup =
                                        await screen.findByTestId(
                                            'playlists-visibility-radio-group',
                                        );
                                    expect(
                                        playlistsVisibilitySettingRadioGroup,
                                    ).toBeTruthy();

                                    const selectedRadio = await within(
                                        playlistsVisibilitySettingRadioGroup,
                                    ).findByA11yState({
                                        selected: true,
                                    });
                                    expect(selectedRadio).toBeTruthy();

                                    expect(selectedRadio).toHaveTextContent(
                                        /public/i,
                                    );
                                },
                            },
                            on: {
                                'Update Playlists Visibility': [
                                    {
                                        cond: 'Is Private Visibility',
                                        target: '#Update Visibility Settings.Playlists.Private',
                                    },
                                    {
                                        cond: 'Is Followers Only Visibility',
                                        target: '#Update Visibility Settings.Playlists.Followers Only',
                                    },
                                ],
                            },
                        },
                        'Followers Only': {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    const playlistsVisibilitySettingRadioGroup =
                                        await screen.findByTestId(
                                            'playlists-visibility-radio-group',
                                        );
                                    expect(
                                        playlistsVisibilitySettingRadioGroup,
                                    ).toBeTruthy();

                                    const selectedRadio = await within(
                                        playlistsVisibilitySettingRadioGroup,
                                    ).findByA11yState({
                                        selected: true,
                                    });
                                    expect(selectedRadio).toBeTruthy();

                                    expect(selectedRadio).toHaveTextContent(
                                        /followers.*only/i,
                                    );
                                },
                            },
                            on: {
                                'Update Playlists Visibility': [
                                    {
                                        cond: 'Is Public Visibility',
                                        target: '#Update Visibility Settings.Playlists.Public',
                                    },
                                    {
                                        cond: 'Is Private Visibility',
                                        target: '#Update Visibility Settings.Playlists.Private',
                                    },
                                ],
                            },
                        },
                        Private: {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    const playlistsVisibilitySettingRadioGroup =
                                        await screen.findByTestId(
                                            'playlists-visibility-radio-group',
                                        );
                                    expect(
                                        playlistsVisibilitySettingRadioGroup,
                                    ).toBeTruthy();

                                    const selectedRadio = await within(
                                        playlistsVisibilitySettingRadioGroup,
                                    ).findByA11yState({
                                        selected: true,
                                    });
                                    expect(selectedRadio).toBeTruthy();

                                    expect(selectedRadio).toHaveTextContent(
                                        /private/i,
                                    );
                                },
                            },
                            on: {
                                'Update Playlists Visibility': [
                                    {
                                        cond: 'Is Public Visibility',
                                        target: '#Update Visibility Settings.Playlists.Public',
                                    },
                                    {
                                        cond: 'Is Followers Only Visibility',
                                        target: '#Update Visibility Settings.Playlists.Followers Only',
                                    },
                                ],
                            },
                        },
                    },
                },
                Relations: {
                    initial: 'Public',
                    states: {
                        Public: {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    const playlistsVisibilitySettingRadioGroup =
                                        await screen.findByTestId(
                                            'playlists-relations-radio-group',
                                        );
                                    expect(
                                        playlistsVisibilitySettingRadioGroup,
                                    ).toBeTruthy();

                                    const selectedRadio = await within(
                                        playlistsVisibilitySettingRadioGroup,
                                    ).findByA11yState({
                                        selected: true,
                                    });
                                    expect(selectedRadio).toBeTruthy();

                                    expect(selectedRadio).toHaveTextContent(
                                        /public/i,
                                    );
                                },
                            },
                            on: {
                                'Update Relations Visibility': [
                                    {
                                        cond: 'Is Private Visibility',
                                        target: '#Update Visibility Settings.Relations.Private',
                                    },
                                    {
                                        cond: 'Is Followers Only Visibility',
                                        target: '#Update Visibility Settings.Relations.Followers Only',
                                    },
                                ],
                            },
                        },
                        'Followers Only': {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    const playlistsVisibilitySettingRadioGroup =
                                        await screen.findByTestId(
                                            'playlists-relations-radio-group',
                                        );
                                    expect(
                                        playlistsVisibilitySettingRadioGroup,
                                    ).toBeTruthy();

                                    const selectedRadio = await within(
                                        playlistsVisibilitySettingRadioGroup,
                                    ).findByA11yState({
                                        selected: true,
                                    });
                                    expect(selectedRadio).toBeTruthy();

                                    expect(selectedRadio).toHaveTextContent(
                                        /followers.*only/i,
                                    );
                                },
                            },
                            on: {
                                'Update Relations Visibility': [
                                    {
                                        cond: 'Is Public Visibility',
                                        target: '#Update Visibility Settings.Relations.Public',
                                    },
                                    {
                                        cond: 'Is Private Visibility',
                                        target: '#Update Visibility Settings.Relations.Private',
                                    },
                                ],
                            },
                        },
                        Private: {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    const playlistsVisibilitySettingRadioGroup =
                                        await screen.findByTestId(
                                            'playlists-relations-radio-group',
                                        );
                                    expect(
                                        playlistsVisibilitySettingRadioGroup,
                                    ).toBeTruthy();

                                    const selectedRadio = await within(
                                        playlistsVisibilitySettingRadioGroup,
                                    ).findByA11yState({
                                        selected: true,
                                    });
                                    expect(selectedRadio).toBeTruthy();

                                    expect(selectedRadio).toHaveTextContent(
                                        /private/i,
                                    );
                                },
                            },
                            on: {
                                'Update Relations Visibility': [
                                    {
                                        cond: 'Is Public Visibility',
                                        target: '#Update Visibility Settings.Relations.Public',
                                    },
                                    {
                                        cond: 'Is Followers Only Visibility',
                                        target: '#Update Visibility Settings.Relations.Followers Only',
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        },
        {
            guards: {
                'Is Public Visibility': (_context, event) => {
                    return event.visibility === 'PUBLIC';
                },

                'Is Private Visibility': (_context, event) => {
                    return event.visibility === 'PRIVATE';
                },

                'Is Followers Only Visibility': (_context, event) => {
                    return event.visibility === 'FOLLOWERS_ONLY';
                },
            },
        },
    );

const updateVisibilitySettingsTestModel = createTestModel<TestingContext>(
    updateVisibilitySettingsMachine,
).withEvents({
    'Update Playlists Visibility': async ({ screen }, e) => {
        const event = e as EventFrom<
            typeof updateVisibilitySettingsModel,
            'Update Playlists Visibility'
        >;

        const playlistsVisibilitySettingRadioGroup = await screen.findByTestId(
            'playlists-visibility-radio-group',
        );
        expect(playlistsVisibilitySettingRadioGroup).toBeTruthy();

        switch (event.visibility) {
            case 'PUBLIC': {
                const publicRadio = within(
                    playlistsVisibilitySettingRadioGroup,
                ).getByText(/public/i);
                expect(publicRadio).toBeTruthy();

                fireEvent.press(publicRadio);

                break;
            }

            case 'PRIVATE': {
                const privateRadio = within(
                    playlistsVisibilitySettingRadioGroup,
                ).getByText(/private/i);
                expect(privateRadio).toBeTruthy();

                fireEvent.press(privateRadio);

                break;
            }

            case 'FOLLOWERS_ONLY': {
                const followersOnlyRadio = within(
                    playlistsVisibilitySettingRadioGroup,
                ).getByText(/followers.*only/i);
                expect(followersOnlyRadio).toBeTruthy();

                fireEvent.press(followersOnlyRadio);

                break;
            }

            default: {
                throw new Error('Reached unreachable state');
            }
        }
    },

    'Update Relations Visibility': async ({ screen }, e) => {
        const event = e as EventFrom<
            typeof updateVisibilitySettingsModel,
            'Update Relations Visibility'
        >;

        const playlistsVisibilitySettingRadioGroup = await screen.findByTestId(
            'playlists-relations-radio-group',
        );
        expect(playlistsVisibilitySettingRadioGroup).toBeTruthy();

        switch (event.visibility) {
            case 'PUBLIC': {
                const publicRadio = within(
                    playlistsVisibilitySettingRadioGroup,
                ).getByText(/public/i);
                expect(publicRadio).toBeTruthy();

                fireEvent.press(publicRadio);

                break;
            }

            case 'PRIVATE': {
                const privateRadio = within(
                    playlistsVisibilitySettingRadioGroup,
                ).getByText(/private/i);
                expect(privateRadio).toBeTruthy();

                fireEvent.press(privateRadio);

                break;
            }

            case 'FOLLOWERS_ONLY': {
                const followersOnlyRadio = within(
                    playlistsVisibilitySettingRadioGroup,
                ).getByText(/followers.*only/i);
                expect(followersOnlyRadio).toBeTruthy();

                fireEvent.press(followersOnlyRadio);

                break;
            }

            default: {
                throw new Error('Reached unreachable state');
            }
        }
    },
});

cases<{
    events: EventFrom<typeof updateVisibilitySettingsModel>[];
    target: {
        Playlists: 'Public' | 'Private' | 'Followers Only';
        Relations: 'Public' | 'Private' | 'Followers Only';
    };
}>(
    'Change visibility settings',
    async ({ events, target }) => {
        const userID = testGetFakeUserID();

        db.myProfileInformation.create({
            userID,
            devicesCounter: 3,
            playlistsCounter: 4,
            followersCounter: 5,
            followingCounter: 6,
            userNickname: internet.userName(),
        });

        const location: LocationObject = {
            timestamp: datatype.number(),
            coords: {
                accuracy: 4,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                latitude: datatype.number({
                    min: -80,
                    max: 75,
                }),
                longitude: datatype.number({
                    min: -180,
                    max: 175,
                }),
                speed: null,
            },
        };

        (getCurrentPositionAsync as any).mockImplementation(() => {
            return Promise.resolve(location);
        });

        const screen = await renderApp();

        const goToMyProfileButton = await screen.findByLabelText(
            /open.*my.*profile/i,
        );
        expect(goToMyProfileButton).toBeTruthy();

        fireEvent.press(goToMyProfileButton);

        const goToMySettingsButton = await screen.findByLabelText(
            /open.*my.*settings/i,
        );
        expect(goToMySettingsButton).toBeTruthy();

        fireEvent.press(goToMySettingsButton);

        const plan = updateVisibilitySettingsTestModel.getPlanFromEvents(
            events,
            { target },
        );

        await plan.test({
            screen,
        });

        await waitFor(() => {
            expect(Toast.show).toHaveBeenCalledWith({
                type: 'success',
                text1: expect.any(String),
            });
        });
        expect(Toast.show).toHaveBeenCalledTimes(1);
    },
    {
        'Can set playlists visibility to public': {
            events: [
                updateVisibilitySettingsModel.events[
                    'Update Playlists Visibility'
                ]({
                    visibility: 'PRIVATE',
                }),
                updateVisibilitySettingsModel.events[
                    'Update Playlists Visibility'
                ]({
                    visibility: 'PUBLIC',
                }),
            ],
            target: {
                Playlists: 'Public',
                Relations: 'Public',
            },
        },

        'Can set playlists visibility to private': {
            events: [
                updateVisibilitySettingsModel.events[
                    'Update Playlists Visibility'
                ]({
                    visibility: 'PRIVATE',
                }),
            ],
            target: {
                Playlists: 'Private',
                Relations: 'Public',
            },
        },

        'Can set playlists visibility to followers only': {
            events: [
                updateVisibilitySettingsModel.events[
                    'Update Playlists Visibility'
                ]({
                    visibility: 'FOLLOWERS_ONLY',
                }),
            ],
            target: {
                Playlists: 'Followers Only',
                Relations: 'Public',
            },
        },

        'Can set relations visibility to public': {
            events: [
                updateVisibilitySettingsModel.events[
                    'Update Relations Visibility'
                ]({
                    visibility: 'PRIVATE',
                }),
                updateVisibilitySettingsModel.events[
                    'Update Relations Visibility'
                ]({
                    visibility: 'PUBLIC',
                }),
            ],
            target: {
                Playlists: 'Public',
                Relations: 'Public',
            },
        },

        'Can set relations visibility to private': {
            events: [
                updateVisibilitySettingsModel.events[
                    'Update Relations Visibility'
                ]({
                    visibility: 'PRIVATE',
                }),
            ],
            target: {
                Playlists: 'Public',
                Relations: 'Private',
            },
        },

        'Can set relations visibility to followers only': {
            events: [
                updateVisibilitySettingsModel.events[
                    'Update Relations Visibility'
                ]({
                    visibility: 'FOLLOWERS_ONLY',
                }),
            ],
            target: {
                Playlists: 'Public',
                Relations: 'Followers Only',
            },
        },
    },
);
