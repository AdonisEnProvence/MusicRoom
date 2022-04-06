import { Text, useSx } from 'dripsy';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useAppContext } from '../contexts/AppContext';
import {
    GOOGLE_AUTH_SESSION_ANDROID_CLIENT_ID,
    GOOGLE_AUTH_SESSION_EXPO_CLIENT_ID,
    GOOGLE_AUTH_SESSION_IOS_CLIENT_ID,
    GOOGLE_AUTH_SESSION_WEB_CLIENT_ID,
} from '../constants/ApiKeys';

WebBrowser.maybeCompleteAuthSession();

const GoogleAuthenticationButton: React.FC = () => {
    const { appService } = useAppContext();
    const [request, response, promptAsync] = Google.useAuthRequest({
        expoClientId: GOOGLE_AUTH_SESSION_EXPO_CLIENT_ID,
        iosClientId: GOOGLE_AUTH_SESSION_IOS_CLIENT_ID,
        androidClientId: GOOGLE_AUTH_SESSION_ANDROID_CLIENT_ID,
        webClientId: GOOGLE_AUTH_SESSION_WEB_CLIENT_ID,
    });

    const sx = useSx();

    React.useEffect(() => {
        if (response !== null) {
            appService.send({
                type: 'RECEIVED_GOOGLE_OAUTH_RESPONSE',
                googleResponse: response,
            });
        }
    }, [response, appService]);

    return (
        <TouchableOpacity
            disabled={!request}
            testID="continue-with-google-authentication-button"
            onPress={async () => {
                await promptAsync();
            }}
            style={sx({
                paddingX: 's',
                paddingY: 'm',
                backgroundColor: 'greyLighter',
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
                Continue with Google
            </Text>
        </TouchableOpacity>
    );
};

export default GoogleAuthenticationButton;
