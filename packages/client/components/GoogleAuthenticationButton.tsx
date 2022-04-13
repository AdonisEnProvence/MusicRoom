import { Text, useSx } from 'dripsy';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { AuthSessionResult } from 'expo-auth-session';
import { useInterpret, useMachine } from '@xstate/react';
import { createMachine } from 'xstate';
import invariant from 'tiny-invariant';
import {
    GOOGLE_AUTH_SESSION_ANDROID_CLIENT_ID,
    GOOGLE_AUTH_SESSION_EXPO_CLIENT_ID,
    GOOGLE_AUTH_SESSION_IOS_CLIENT_ID,
    GOOGLE_AUTH_SESSION_WEB_CLIENT_ID,
} from '../constants/ApiKeys';
import { assertEventType } from '../machines/utils';

WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthenticationButton {
    buttonLabel?: string;
    testID: string;
    onResponse: (response: AuthSessionResult) => void;
    disabledAsConfirmed?: boolean;
}

const GoogleAuthenticationButton: React.FC<GoogleAuthenticationButton> = ({
    disabledAsConfirmed,
    onResponse,
    buttonLabel,
    testID,
}) => {
    const [request, response, promptAsync] = Google.useAuthRequest({
        expoClientId: GOOGLE_AUTH_SESSION_EXPO_CLIENT_ID,
        iosClientId: GOOGLE_AUTH_SESSION_IOS_CLIENT_ID,
        androidClientId: GOOGLE_AUTH_SESSION_ANDROID_CLIENT_ID,
        webClientId: GOOGLE_AUTH_SESSION_WEB_CLIENT_ID,
    });

    const sx = useSx();

    const sendToHooksService = useInterpret(
        () =>
            createMachine(
                {
                    schema: {
                        events: {} as {
                            type: 'Google response has changed';
                            response: AuthSessionResult | null;
                        },
                    },

                    on: {
                        'Google response has changed': {
                            cond: 'Google response is defined',
                            actions: 'Call onResponse method',
                        },
                    },
                },
                {
                    guards: {
                        'Google response is defined': (_context, event) => {
                            assertEventType(
                                event,
                                'Google response has changed',
                            );
                            return event.response !== null;
                        },
                    },
                },
            ),
        {
            actions: {
                'Call onResponse method': (_context, event) => {
                    assertEventType(event, 'Google response has changed');
                    invariant(
                        event.response !== null,
                        'should never occurs event.reponse is null',
                    );
                    onResponse(event.response);
                },
            },
        },
    );

    React.useEffect(() => {
        sendToHooksService.send({
            type: 'Google response has changed',
            response,
        });
    }, [response, sendToHooksService]);

    return (
        <TouchableOpacity
            disabled={disabledAsConfirmed || !request}
            testID={testID}
            onPress={async () => {
                await promptAsync();
            }}
            style={sx({
                marginTop: 'l',
                paddingX: 's',
                paddingY: 'm',
                backgroundColor: disabledAsConfirmed
                    ? 'secondary'
                    : 'greyLighter',
                borderRadius: 's',
            })}
        >
            <Text
                sx={{
                    color: 'greyLight',
                    textAlign: 'center',
                    fontWeight: 'bold',
                }}
            >
                {buttonLabel ?? 'Continue with Google'}
            </Text>
        </TouchableOpacity>
    );
};

export default GoogleAuthenticationButton;
