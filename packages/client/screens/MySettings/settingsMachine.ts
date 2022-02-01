import { UserSettingVisibility } from '@musicroom/types';
import invariant from 'tiny-invariant';
import { ActorRefFrom, assign, send } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { assertEventType } from '../../machines/utils';
import {
    setUserDevicesSettingVisibility,
    setUserPlaylistsSettingVisibility,
    setUserRelationsSettingVisibility,
} from '../../services/UserSettingsService';

const visibilitySettingModel = createModel(
    {
        lastSelectedVisibilityStatus: undefined as
            | UserSettingVisibility
            | undefined,
    },
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
            'Assign visibility status to context': () => ({}),
        },
    },
);

const visibilitySettingMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QDUCWtUCNUBtUBcBPAAgGUx99UA7KAOjQ2zyLPwEN8BXWOgBS6Y8AYwDEAVQAOETmGKMsuAoUShJAewxV11VSAAeiAOwAGI3QCcARiMWLAJgCsVgCwv7ADnsAaECoSOJgDMdI4AbEEWtlEmTh4uAL4JvgrMymQUVLQM6IosJKQc3LwAYuo4OOoA7mAATrDEAPLUOIQS0rLyuWlEehpaqDp6hgj2YS50QS6O9vZGHo5BVmEmNr7+Vg50pkHOYcu7LkbuSSndSqzklDT0qRcFRTz8tagAbrLtMvhyd-l9mgRBrokAZjGZLDY7E5XO4vOtEDYQvYgqYTC4VkYrEszKcQL90lcsvQ+HUMLBvtRhHJ8OpiAAhdjCADWYGoEH4pPQROINPpjJZbNEEB0YDoNFe6hZHPqXOIUi+kC6THubE4PH+AyGIJGVnssW2i3sFmckXirnhCCiHjoHmWHgsQS81jCRiCuPxl0yN2lZIpVJ5tIZzNZ7IAImBMOouJS5AAlMAARy4cHwDV5QYFEFE+nJsjo7AAZt9apMTCYNYCtaARmELCZJjCYlEjGFxharTblg4XEtFl4wu7zvkMtdsiSZeTWf70-yQ6JyGylXl0vLOjPg2yK9pgdXjD4-IgO7ba-Ye1Y+2MkskQNR1BA4HoPQUvdkn6rivxBCIt0DhohHEYjh0EaRh6ueswrPaFq9nQmw9rsqxhKe6KDsqw6Et6b6FGqpTlJUNT1E0LT+GoALbn+CCgdB56wRY8GBMsyEDteWEvrcQ4Eo8vB8C87zfD+VagggVirNaHi1hYrZWB4jpGEY1HmLW9GIUxqHLp6o7sWhnE4QJO5CS4Hjtta+wLO4QRIQ4yKOGpPTPppPpclO1KBrObJ0AAkhAOBgHpFHnhZdDBJJQRzEEsSQe2tg2mE8QuiiSwojZLEcRpRKOZOMYBnyG7suOvo3NlGYhn52qIAsVilmYLomLaxpHO2jgTIEdEeLayLLK2tkqhhY6cpl06ubldDhpG0b+vGSYpmmQ2ZqVu4IBZ9ihD2AFWq64VjFFFgxfEdiOIswSuN16FsRlfouTlc0gv0lb6SMhkWuJ5j2iYdFlsi7g9idBJsfNQmnhap5BWWtWrNJmIWQdV4JEAA */
    visibilitySettingModel.createMachine(
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
                        Idle: {},
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
                        },
                        'Debounce Requests to Backend': {
                            after: {
                                '300': {
                                    target: '#Visibility Setting.Persistence to Backend.Persisting to Backend',
                                },
                            },
                        },
                    },
                    on: {
                        'Send Visibility Update to Backend': {
                            actions: 'Assign visibility status to context',
                            target: '#Visibility Setting.Persistence to Backend.Debounce Requests to Backend',
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

                'Assign visibility status to context': assign({
                    lastSelectedVisibilityStatus: (_context, event) => {
                        assertEventType(
                            event,
                            'Send Visibility Update to Backend',
                        );

                        return event.visibility;
                    },
                }),
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
                            'Persist Updated Visibility Status': async ({
                                lastSelectedVisibilityStatus,
                            }) => {
                                invariant(
                                    lastSelectedVisibilityStatus !== undefined,
                                    'lastSelectedVisibilityStatus must have been assigned before trying to send it to the server',
                                );

                                await setUserPlaylistsSettingVisibility({
                                    visibility: lastSelectedVisibilityStatus,
                                });
                            },
                        },
                    }),

                'Relations Visibility Manager Machine':
                    visibilitySettingMachine.withConfig({
                        services: {
                            'Persist Updated Visibility Status': async ({
                                lastSelectedVisibilityStatus,
                            }) => {
                                invariant(
                                    lastSelectedVisibilityStatus !== undefined,
                                    'lastSelectedVisibilityStatus must have been assigned before trying to send it to the server',
                                );

                                await setUserRelationsSettingVisibility({
                                    visibility: lastSelectedVisibilityStatus,
                                });
                            },
                        },
                    }),

                'Devices Visibility Manager Machine':
                    visibilitySettingMachine.withConfig({
                        services: {
                            'Persist Updated Visibility Status': async ({
                                lastSelectedVisibilityStatus,
                            }) => {
                                invariant(
                                    lastSelectedVisibilityStatus !== undefined,
                                    'lastSelectedVisibilityStatus must have been assigned before trying to send it to the server',
                                );

                                await setUserDevicesSettingVisibility({
                                    visibility: lastSelectedVisibilityStatus,
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
