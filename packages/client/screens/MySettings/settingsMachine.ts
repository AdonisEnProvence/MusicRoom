import { UserSettingVisibility } from '@musicroom/types';
import { ActorRefFrom, send } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { assertEventType } from '../../machines/utils';
import {
    setUserDevicesSettingVisibility,
    setUserPlaylistsSettingVisibility,
    setUserRelationsSettingVisibility,
} from '../../services/UserSettingsService';

const visibilitySettingModel = createModel(
    {},
    {
        events: {
            'Update Visibility': (args: {
                visibility: UserSettingVisibility;
            }) => args,

            'Send Visibility Update to Backend': (args: {
                visibility: UserSettingVisibility;
            }) => args,
        },
        actions: {
            'Send updated visibility to server': () => ({}),
        },
    },
);

const visibilitySettingMachine = visibilitySettingModel.createMachine(
    {
        id: 'Visibility Setting',
        type: 'parallel',
        states: {
            'Visibility Status': {
                initial: 'Public',
                states: {
                    Public: {
                        tags: 'Public Visibility',
                        on: {
                            'Update Visibility': [
                                {
                                    actions:
                                        'Send updated visibility to server',
                                    cond: 'Is Private Visibility',
                                    target: '#Visibility Setting.Visibility Status.Private',
                                },
                                {
                                    actions:
                                        'Send updated visibility to server',
                                    cond: 'Is Followers Only Visibility',
                                    target: '#Visibility Setting.Visibility Status.Followers Only',
                                },
                            ],
                        },
                    },
                    'Followers Only': {
                        tags: 'Followers Only Visibility',
                        on: {
                            'Update Visibility': [
                                {
                                    actions:
                                        'Send updated visibility to server',
                                    cond: 'Is Public Visibility',
                                    target: '#Visibility Setting.Visibility Status.Public',
                                },
                                {
                                    actions:
                                        'Send updated visibility to server',
                                    cond: 'Is Private Visibility',
                                    target: '#Visibility Setting.Visibility Status.Private',
                                },
                            ],
                        },
                    },
                    Private: {
                        tags: 'Private Visibility',
                        on: {
                            'Update Visibility': [
                                {
                                    actions:
                                        'Send updated visibility to server',
                                    cond: 'Is Public Visibility',
                                    target: '#Visibility Setting.Visibility Status.Public',
                                },
                                {
                                    actions:
                                        'Send updated visibility to server',
                                    cond: 'Is Followers Only Visibility',
                                    target: '#Visibility Setting.Visibility Status.Followers Only',
                                },
                            ],
                        },
                    },
                },
            },
            'Persistence to Backend': {
                initial: 'Idle',
                states: {
                    Idle: {
                        on: {
                            'Send Visibility Update to Backend': {
                                target: '#Visibility Setting.Persistence to Backend.Persisting to Backend',
                            },
                        },
                    },
                    'Persisting to Backend': {
                        invoke: {
                            id: 'Persist Updated Visibility Status',
                            src: 'Persist Updated Visibility Status',
                            onDone: [
                                {
                                    target: '#Visibility Setting.Persistence to Backend.Idle',
                                },
                            ],
                        },
                        on: {
                            'Send Visibility Update to Backend': {
                                target: '#Visibility Setting.Persistence to Backend.Persisting to Backend',
                            },
                        },
                    },
                },
            },
        },
    },
    {
        guards: {
            'Is Public Visibility': (_context, event) => {
                assertEventType(event, 'Update Visibility');

                return event.visibility === 'PUBLIC';
            },

            'Is Followers Only Visibility': (_context, event) => {
                assertEventType(event, 'Update Visibility');

                return event.visibility === 'FOLLOWERS_ONLY';
            },

            'Is Private Visibility': (_context, event) => {
                assertEventType(event, 'Update Visibility');

                return event.visibility === 'PRIVATE';
            },
        },

        actions: {
            'Send updated visibility to server': send((_context, event) => {
                assertEventType(event, 'Update Visibility');

                return visibilitySettingModel.events[
                    'Send Visibility Update to Backend'
                ]({
                    visibility: event.visibility,
                });
            }),
        },

        services: {
            'Persist Updated Visibility Status': (_context, event) => {
                console.log('Persist Updated Visibility Status service', event);

                return Promise.resolve();
            },
        },
    },
);

export type VisibilitySettingMachineActor = ActorRefFrom<
    typeof visibilitySettingMachine
>;

const settingsModel = createModel(
    {},
    {
        events: {
            'Update Playlists Visibility Setting': (
                visibility: UserSettingVisibility,
            ) => ({ visibility }),

            'Update Relations Visibility Setting': (
                visibility: UserSettingVisibility,
            ) => ({ visibility }),

            'Update Devices Visibility Setting': (
                visibility: UserSettingVisibility,
            ) => ({ visibility }),
        },
        actions: {
            'Forward to Playlists Visibility Manager Machine': () => ({}),
            'Forward to Relations Visibility Manager Machine': () => ({}),
            'Forward to Devices Visibility Manager Machine': () => ({}),
        },
    },
);

export const settingsMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QGUwBc0EsB2VYDoAFAGwEMBPYzWNWAAgDVrMAjTKtcgYgFUAHCKTRg6JClRr0msVu0yc6qDDiiJQfAPYysG7GpAAPRAHYAHPgBMAVgAsxgAzGrjs85sAaEOUQBmC+Z8AThsARmcLADYIswsQiIBfeM8lLFwCACUwMh1sKWY2Dm5+QWE6TOzMXTyZAvlyRXRU1SQQTW1KvRajBFN7fCc7R2djV3sPL0QrCJt8OMDTWLD7QKsQ40TkxpUCABEwADdMAGM4Rny5Tl4BIRE9w5Pq2UKG5Vx9NvkO-W6zS1sHJwuUxuTzeBCBCz4CIhUx2QI+BbQ6ymRJJEDYDQQOD6FLbIhkSjUWhnGoXMHqLSfXTfRA2cymXorXo2QJxewhcZgmw2SGmHz8+F0-zGCyBDYgXFpfDlIQdR61TjvSk5GkIOygxDRcwRZb2aY+aJjaziyV4fB3Y6naRPOpK9rUrq0+mRYwwiz+aamYyBDUICyOfD2Kwjd1WeYOfkWE1bNJ2qmdUDdCw+X1rfCBDOBaIhDnLHlOVHxIA */
    settingsModel.createMachine(
        {
            id: 'Settings',
            type: 'parallel',
            states: {
                'Playlists Visibility': {
                    invoke: {
                        id: 'Playlists Visibility Manager Machine',
                        src: 'Playlists Visibility Manager Machine',
                    },
                    on: {
                        'Update Playlists Visibility Setting': {
                            actions:
                                'Forward to Playlists Visibility Manager Machine',
                            internal: true,
                            target: '#Settings.Playlists Visibility',
                        },
                    },
                },
                'Relations Visibility': {
                    invoke: {
                        id: 'Relations Visibility Manager Machine',
                        src: 'Relations Visibility Manager Machine',
                    },
                    on: {
                        'Update Relations Visibility Setting': {
                            actions:
                                'Forward to Relations Visibility Manager Machine',
                            internal: true,
                            target: '#Settings.Relations Visibility',
                        },
                    },
                },
                'Devices Visibility': {
                    invoke: {
                        id: 'Devices Visibility Manager Machine',
                        src: 'Devices Visibility Manager Machine',
                    },
                    on: {
                        'Update Devices Visibility Setting': {
                            actions:
                                'Forward to Devices Visibility Manager Machine',
                            internal: true,
                            target: '#Settings.Devices Visibility',
                        },
                    },
                },
            },
        },
        {
            services: {
                'Playlists Visibility Manager Machine':
                    visibilitySettingMachine.withConfig({
                        services: {
                            'Persist Updated Visibility Status': async (
                                _context,
                                event,
                            ) => {
                                assertEventType(
                                    event,
                                    'Send Visibility Update to Backend',
                                );

                                await setUserPlaylistsSettingVisibility({
                                    visibility: event.visibility,
                                });
                            },
                        },
                    }),

                'Relations Visibility Manager Machine':
                    visibilitySettingMachine.withConfig({
                        services: {
                            'Persist Updated Visibility Status': async (
                                _context,
                                event,
                            ) => {
                                assertEventType(
                                    event,
                                    'Send Visibility Update to Backend',
                                );

                                await setUserRelationsSettingVisibility({
                                    visibility: event.visibility,
                                });
                            },
                        },
                    }),

                'Devices Visibility Manager Machine':
                    visibilitySettingMachine.withConfig({
                        services: {
                            'Persist Updated Visibility Status': async (
                                _context,
                                event,
                            ) => {
                                assertEventType(
                                    event,
                                    'Send Visibility Update to Backend',
                                );

                                await setUserDevicesSettingVisibility({
                                    visibility: event.visibility,
                                });
                            },
                        },
                    }),
            },

            actions: {
                'Forward to Playlists Visibility Manager Machine': send(
                    (_context, event) => {
                        assertEventType(
                            event,
                            'Update Playlists Visibility Setting',
                        );

                        return visibilitySettingModel.events[
                            'Update Visibility'
                        ]({
                            visibility: event.visibility,
                        });
                    },
                    {
                        to: 'Playlists Visibility Manager Machine',
                    },
                ),

                'Forward to Relations Visibility Manager Machine': send(
                    (_context, event) => {
                        assertEventType(
                            event,
                            'Update Playlists Visibility Setting',
                        );

                        return visibilitySettingModel.events[
                            'Update Visibility'
                        ]({
                            visibility: event.visibility,
                        });
                    },
                    {
                        to: 'Relations Visibility Manager Machine',
                    },
                ),

                'Forward to Devices Visibility Manager Machine': send(
                    (_context, event) => {
                        assertEventType(
                            event,
                            'Update Playlists Visibility Setting',
                        );

                        return visibilitySettingModel.events[
                            'Update Visibility'
                        ]({
                            visibility: event.visibility,
                        });
                    },
                    {
                        to: 'Devices Visibility Manager Machine',
                    },
                ),
            },
        },
    );
