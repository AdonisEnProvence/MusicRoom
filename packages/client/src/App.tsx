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
import { createMachine } from 'xstate';
import { useMachine } from '@xstate/react';

const playingMachine = createMachine({
    initial: 'paused',

    states: {
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
});

const App: React.FC = () => {
    const [state, send] = useMachine(playingMachine);

    return (
        <SafeAreaView>
            <StatusBar barStyle="light-content" />
            <ScrollView contentInsetAdjustmentBehavior="automatic">
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
