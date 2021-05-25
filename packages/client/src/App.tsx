import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    StatusBar,
    Text,
    View,
    TouchableOpacity,
} from 'react-native';
import { assign, createMachine } from 'xstate';
import { useMachine } from '@xstate/react';
import {
    AuthConfiguration,
    authorize,
    AuthorizeResult,
} from 'react-native-app-auth';

// Api Config object, replace with your own applications client id and urls
const androidLocalHostIP = '10.0.2.2';
const spotifyConfig: AuthConfiguration = {
    clientId: '61140504dfd14dd591dbfdd22d8a253a', // available on the app page
    redirectUrl: 'io.identityserver.demo:/callback', // the redirect you defined after creating the app
    scopes: ['user-read-email', 'playlist-modify-public', 'user-read-private'], // the scopes you need to access
    serviceConfiguration: {
        authorizationEndpoint: 'https://accounts.spotify.com/authorize', //`http://${androidLocalHostIP}:3333/spotify/auth`,
        tokenEndpoint: 'https://musicroomspotify.herokuapp.com/api/token',
    },
    usePKCE: false,
    dangerouslyAllowInsecureHttpRequests: true, //This needs to become a env var TODO
};

interface PlayingMachineContext {
    session?: AuthorizeResult;
}

type PlayingMachineEvent =
    | { type: 'AUTHENTICATED_WITH_SPOTIFY'; session: AuthorizeResult }
    | { type: 'TOGGLE' };

const playingMachine = createMachine<
    PlayingMachineContext,
    PlayingMachineEvent
>(
    {
        context: {
            session: undefined,
        },

        initial: 'authenticating',

        states: {
            authenticating: {
                invoke: {
                    src: 'authenticating',
                },

                on: {
                    AUTHENTICATED_WITH_SPOTIFY: {
                        target: 'paused',
                        actions: assign({
                            session: (_context, { session }) => session,
                        }),
                    },
                },
            },

            paused: {
                on: {
                    TOGGLE: {
                        target: 'playing',
                    },
                },
            },
            playing: {
                on: {
                    TOGGLE: {
                        target: 'paused',
                    },
                },
            },
        },
    },
    {
        services: {
            authenticating: () => async (sendBack) => {
                try {
                    console.log(spotifyConfig);
                    const authState = await authorize(spotifyConfig);

                    console.log('fetched session', authState);
                    // await SpotifyRemote.connect(session.accessToken);

                    sendBack({
                        type: 'AUTHENTICATED_WITH_SPOTIFY',
                        session: authState,
                    });
                } catch (err) {
                    console.error('erreur ici', err);
                }
            },
        },
    },
);

const App: React.FC = () => {
    const [state, send] = useMachine(playingMachine);

    return (
        <SafeAreaView>
            <StatusBar barStyle="light-content" />
            <ScrollView contentInsetAdjustmentBehavior="automatic">
                {state.matches('authenticating') ? (
                    <View>
                        <Text>Loading</Text>
                    </View>
                ) : (
                    <View style={styles.playerContainer}>
                        <Text style={styles.playerState}>
                            {state.matches('paused') ? 'Paused' : 'Playing'}
                        </Text>
                        <Text
                            onPress={async () => {
                                try {
                                    await fetch(
                                        `http://${androidLocalHostIP}:3333/ping`,
                                    );
                                } catch (e) {
                                    console.error('oeoe', e);
                                }
                            }}
                        >
                            Submit
                        </Text>

                        <TouchableOpacity
                            style={styles.playerToggleButton}
                            onPress={() => send('TOGGLE')}
                        >
                            <Text style={styles.playerToggleButtonText}>
                                {state.matches('paused') ? 'Play' : 'Pause'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    playerContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',

        marginTop: 20,
    },

    playerState: {
        fontSize: 20,
    },

    playerToggleButton: {
        marginTop: 40,
        width: 65,
        flexDirection: 'row',
        justifyContent: 'center',

        backgroundColor: '#2aa198',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 100,
    },

    playerToggleButtonText: {
        color: 'white',
    },
});

export default App;
