import { createModel } from 'xstate/lib/model';

export const appModel = createModel(
    {
        email: undefined as string | undefined,
        password: undefined as string | undefined,
    },
    {
        events: {
            SIGN_IN: (args: { email: string; password: string }) => args,

            ACKNOWLEDGE_SOCKET_CONNECTION: () => ({}),

            JOIN_ROOM: (roomID: string) => ({ roomID }),
            REQUEST_LOCATION_PERMISSION: () => ({}),

            __ENTER_MPE_EXPORT_TO_MTV: () => ({}),
            __EXIT_MPE_EXPORT_TO_MTV: () => ({}),
        },
    },
);
