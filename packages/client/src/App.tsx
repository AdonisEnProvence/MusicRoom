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
    auth as SpotifyAuth,
    remote as SpotifyRemote,
    ApiScope,
    ApiConfig,
    SpotifySession,
} from 'react-native-spotify-remote';

// Api Config object, replace with your own applications client id and urls
const spotifyConfig: ApiConfig = {
    clientID: 'client id',
    redirectURL: 'org.reactjs.native.example.client://oauthredirect',
    // tokenRefreshURL: 'http://localhost:3000/refresh',
    // tokenSwapURL: 'http://localhost:3000/swap',

    scopes: [ApiScope.StreamingScope],
};

interface PlayingMachineContext {
    session?: SpotifySession;
}

type PlayingMachineEvent =
    | { type: 'AUTHENTICATED_WITH_SPOTIFY'; session: SpotifySession }
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
                    const session = await SpotifyAuth.authorize(spotifyConfig);

                    console.log('fetched session', session);
                    await SpotifyRemote.connect(session.accessToken);

                    sendBack({
                        type: 'AUTHENTICATED_WITH_SPOTIFY',
                        session,
                    });
                } catch (err) {
                    console.error(err);
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
