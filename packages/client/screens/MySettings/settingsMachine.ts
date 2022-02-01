import { UserSettingVisibility } from '@musicroom/types';
import { createModel } from 'xstate/lib/model';

const visibilitySettingModel = createModel(
    {},
    {
        events: {
            'Update Visibility': (visibility: UserSettingVisibility) => ({
                visibility,
            }),
            'Send Visibility Update to Backend': () => ({}),
        },
        actions: {
            'Send updated visibility to server': () => ({}),
        },
    },
);

const visibilitySettingMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QDUCWtUCNUBtUBcBPAAgGUx99UA7KAOjQ2zyLPwEN8BXWOgBS6Y8AYwDEAVQAOETmGKMsuAoUShJAewxV11VSAAeiAOwAGI3QCcARiMWAzLYCsAJjvOTzgDQgVCACwAHCaWFo5GjhYBAGyOVnZWVlEAvkneCszKZBRUtAzoiiwkpBzcvABi6jg46gDuYABOsMQA8tQ4hBLSsvL5GUR6GlqoOnqGCM5RfnR2fi4m8-Y2AbPevlYBViEBRnahy1auNilpvUqs5JQ09OlnRSU8-PWoAG6ynTL4cjeFA5oEw7okAZjGZLDZ7E5XO4vD5EDYprswiYAhYolY-GiwscQN9MhccvQ+A0MLBPtRhHJ8OpiAAhdjCADWYGoEDoAEkIDgwO9urj+kDBv8RkCxutHHQ-HZ4kYjBsTI4zBYjKs4R5nBLTO4IvtAti+UVsld+MT0GSKcQqbT6UyWcbGqarhbqXTGcyIKIIDowHQaM91Ey7ST8MQpB9ID0mLc2JweL8hsLQKKAuLJdLZVZ5YrlbCEHs6EZAo5JR49tY9adCllLrkifbSczzZaXTbWbWg46m9a3TzPhGCso40LAYnEGjNlFtvFYgr7B4Vbn4pY-AdnH4dlFJn5nClUiBqOoIHA9PqqwS8pHK8UY7wBEJUMJB9ph8CEGFxc4lQcAgEHCY7CYLHnf8pkCUJTCVeUNjscsLzxQ1chPK9SjoCoqlqYkWjaXw1D+J9RmMGFfGAiUUSRCDHCgmD+3OeDrgrPF7hvJ5Xk+R8AXwhAM3WOhogsSIEjsGITElICTCiSxSL4oxnAmAIqL6A1qzo2DzkYtiExfQJ5z4-MZRkyUYhRZJd0Q2jA1NBtKWdLtbQ5Ll1OfMZpPnLi7AldYJyiXZEi3Ix5KjfEjTbCzySsq1XVtYLSQ7ayIogByONiAJ8ysUI7AVMI4gLFz5mCDdnB-ex9PsOSTPomilPM+tQqdcKWwSkVEC0nNk3MNxnALEx0QzWU-LKlTFIJBqR3GPx52ccUrAonYlVMKVhK3HckiAA */
    visibilitySettingModel.createMachine({
        id: 'Visibility Setting',
        type: 'parallel',
        states: {
            'Visibility Status': {
                initial: 'Public',
                states: {
                    Public: {
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
                                    cond: 'Is Followers Only',
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
                            'Update Visibility': {
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
                            'Update Visibility': {
                                target: '#Visibility Setting.Persistence to Backend.Persisting to Backend',
                            },
                        },
                    },
                },
            },
        },
    });

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
        {},
    );
