import { Text, useSx, View } from '@dripsy/core';
import { Sender } from '@xstate/react/lib/types';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent,
} from '../../../machines/appMusicPlayerMachine';
import { AppUserMachineEvent } from '../../../machines/appUserMachine';

interface SettingsTabProps {
    context: AppMusicPlayerMachineContext;
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    sendToUserMachine: Sender<AppUserMachineEvent>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
    context,
    sendToUserMachine,
    sendToMachine,
}) => {
    const sx = useSx();

    return (
        <View>
            <Text sx={{ color: 'white' }}>Welcome to settings tab </Text>
            {context.hasTimeAndPositionConstraints && (
                <TouchableOpacity
                    onPress={() => {
                        sendToUserMachine({
                            type: 'REQUEST_DEDUPLICATE_LOCATION_PERMISSION',
                        });
                    }}
                    style={sx({
                        backgroundColor: 'secondary',
                        padding: 'l',
                        borderRadius: 's',
                        textAlign: 'center',
                    })}
                >
                    <Text>REQUEST LOCATION</Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity
                onPress={() => {
                    sendToMachine({
                        type: 'LEAVE_ROOM',
                    });
                }}
                style={sx({
                    backgroundColor: '#8B0000',
                    padding: 'l',
                    borderRadius: 's',
                    textAlign: 'center',
                })}
            >
                <Text>LEAVE THE ROOM</Text>
            </TouchableOpacity>
        </View>
    );
};

export default SettingsTab;
