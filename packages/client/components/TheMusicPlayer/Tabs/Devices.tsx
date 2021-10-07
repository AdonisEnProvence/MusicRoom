import { Sender } from '@xstate/react/lib/types';
import { Text, View } from 'dripsy';
import React from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import {
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent,
} from '../../../machines/appMusicPlayerMachine';
import { AppUserMachineContext } from '../../../machines/appUserMachine';

interface DevicesTabProps {
    userContext: AppUserMachineContext;
    context: AppMusicPlayerMachineContext;
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
}

const DevicesTab: React.FC<DevicesTabProps> = ({
    userContext,
    context,
    sendToMachine,
}) => {
    return (
        <View>
            <Text sx={{ color: 'white' }}>
                Welcome to our great Devices You have{' '}
                {userContext.devices.length} connected devices
            </Text>
            {userContext.devices.length > 0 && (
                <FlatList
                    data={userContext.devices}
                    renderItem={({ item: { deviceID, name } }) => (
                        <TouchableOpacity
                            onPress={() => {
                                sendToMachine({
                                    type: 'CHANGE_EMITTING_DEVICE',
                                    deviceID,
                                });
                            }}
                        >
                            <Text
                                sx={{
                                    color: 'white',
                                }}
                            >
                                {name}{' '}
                                {deviceID ===
                                context.userRelatedInformation?.emittingDeviceID
                                    ? 'EMITTING'
                                    : ''}
                            </Text>
                        </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.deviceID}
                />
            )}
        </View>
    );
};

export default DevicesTab;
