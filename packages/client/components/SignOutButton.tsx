import { Text, useSx } from 'dripsy';
import { TouchableOpacity } from 'react-native';
import React from 'react';
import { createMachine } from 'xstate';
import { useMachine } from '@xstate/react';
import { useAppContext } from '../contexts/AppContext';

const SignOutButton: React.FC<{ testID?: string }> = ({ testID }) => {
    const { appService } = useAppContext();
    const sx = useSx();
    function handleSignOutButtonPress() {
        sendToDebouncingMachine('BUTTON_PRESSED');
    }

    const [_state, sendToDebouncingMachine] = useMachine(
        createMachine(
            {
                initial: 'idle',

                states: {
                    idle: {},

                    debouncing: {
                        after: {
                            500: {
                                target: 'idle',
                                actions: 'callOnPressMethod',
                            },
                        },
                    },
                },

                on: {
                    BUTTON_PRESSED: {
                        target: 'debouncing',
                    },
                },
            },
            {
                actions: {
                    callOnPressMethod: () => appService.send('SIGN_OUT'),
                },
            },
        ),
    );

    return (
        <TouchableOpacity
            testID={testID}
            onPress={handleSignOutButtonPress}
            style={sx({
                marginTop: 'l',
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
                Sign Out
            </Text>
        </TouchableOpacity>
    );
};

export default SignOutButton;
