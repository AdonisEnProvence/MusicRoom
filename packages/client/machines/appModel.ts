import { MyProfileInformation } from '@musicroom/types';
import { AuthSessionResult } from 'expo-auth-session';
import { createModel } from 'xstate/lib/model';

export const appModel = createModel(
    {
        myProfileInformation: undefined as MyProfileInformation | undefined,
        email: undefined as string | undefined,
        password: undefined as string | undefined,
        confirmationCode: undefined as string | undefined,
        passwordResetCode: undefined as string | undefined,
        userGoogleAccessToken: undefined as string | undefined,
        passwordResetNewPassword: undefined as string | undefined,
    },
    {
        events: {
            SIGN_IN: (args: { email: string; password: string }) => args,
            SIGNED_UP_SUCCESSFULLY: () => ({}),
            SIGN_OUT: () => ({}),
            SUBMIT_EMAIL_CONFIRMATION_FORM: (args: { code: string }) => args,
            RESEND_CONFIRMATION_EMAIL: () => ({}),
            REQUEST_PASSWORD_RESET: (args: { email: string }) => args,
            SUBMIT_PASSWORD_RESET_CONFIRMATION_CODE_FORM: (args: {
                code: string;
            }) => args,
            RESEND_PASSWORD_RESET_CODE: () => ({}),
            SUBMIT_PASSWORD_RESET_NEW_PASSWORD_FORM: (args: {
                password: string;
            }) => args,
            ROLLBACK_PASSWORD_RESET: () => ({}),
            __BROADCAST_RELOAD_INTO_BROADCAST_CHANNEL: () => ({}),
            __RECEIVED_RELOAD_PAGE: () => ({}),
            __AUTHENTICATED: () => ({}),

            //Google authentication
            RECEIVED_GOOGLE_OAUTH_RESPONSE: (args: {
                googleResponse: AuthSessionResult;
            }) => args,
            __RETRIEVED_USER_GOOGLE_ACCESS_TOKEN_SUCCESSFULLY: (
                userGoogleAccessToken: string,
            ) => ({ userGoogleAccessToken }),
            __FAILED_TO_RETRIEVE_USER_GOOGLE_ACCESS_TOKEN: () => ({}),
            ///

            ACKNOWLEDGE_SOCKET_CONNECTION: () => ({}),

            JOIN_ROOM: (roomID: string) => ({ roomID }),
            REQUEST_LOCATION_PERMISSION: () => ({}),

            __ENTER_MPE_EXPORT_TO_MTV: () => ({}),
            __EXIT_MPE_EXPORT_TO_MTV: () => ({}),
        },
    },
);

export const resetUserGoogleAccessToken = appModel.assign({
    userGoogleAccessToken: () => undefined,
});
