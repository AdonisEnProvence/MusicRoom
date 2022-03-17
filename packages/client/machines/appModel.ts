import { createModel } from 'xstate/lib/model';

export const appModel = createModel(
    {
        userID: undefined as string | undefined,
        email: undefined as string | undefined,
        password: undefined as string | undefined,
    },
    {
        events: {
            SIGN_IN: (args: { email: string; password: string }) => args,
            SIGNED_UP_SUCCESSFULLY: (userID: string) => ({ userID }),
            SIGN_OUT: () => ({}),
            __BROADCAST_RELOAD_INTO_BROADCAST_CHANNEL: () => ({}),
            __RECEIVED_RELOAD_PAGE: () => ({}),

            ACKNOWLEDGE_SOCKET_CONNECTION: () => ({}),

            JOIN_ROOM: (roomID: string) => ({ roomID }),
            REQUEST_LOCATION_PERMISSION: () => ({}),

            __ENTER_MPE_EXPORT_TO_MTV: () => ({}),
            __EXIT_MPE_EXPORT_TO_MTV: () => ({}),
        },
    },
);
