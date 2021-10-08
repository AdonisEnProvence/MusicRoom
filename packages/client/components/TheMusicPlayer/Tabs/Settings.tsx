import { Foundation } from '@expo/vector-icons';
import { BottomSheetHandle, BottomSheetModal } from '@gorhom/bottom-sheet';
import { Sender } from '@xstate/react/lib/types';
import { Text, useSx, View } from 'dripsy';
import React, { useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent,
} from '../../../machines/appMusicPlayerMachine';
import {
    AppUserMachineContext,
    AppUserMachineEvent,
} from '../../../machines/appUserMachine';

interface SettingsTabProps {
    context: AppMusicPlayerMachineContext;
    userContext: AppUserMachineContext;
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    sendToUserMachine: Sender<AppUserMachineEvent>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
    context,
    userContext,
    sendToUserMachine,
    sendToMachine,
}) => {
    const sx = useSx();
    const insets = useSafeAreaInsets();

    //Bottom sheet related
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const snapPoints = [200];
    const HANDLE_HEIGHT = 24; // From https://gorhom.github.io/react-native-bottom-sheet/props#handleheight
    const contentHeightForFirstSnapPoint = snapPoints[0] - HANDLE_HEIGHT;

    function handlePresentDevicesModalPress() {
        bottomSheetModalRef.current?.present();
    }
    ///

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
                onPress={handlePresentDevicesModalPress}
                style={sx({
                    backgroundColor: 'secondary',
                    padding: 'l',
                    borderRadius: 's',
                    textAlign: 'center',
                })}
            >
                <Text>Change emitting device</Text>
            </TouchableOpacity>

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
                <Text>Leave the room</Text>
            </TouchableOpacity>

            <BottomSheetModal
                ref={bottomSheetModalRef}
                index={0}
                snapPoints={snapPoints}
                backgroundStyle={sx({
                    backgroundColor: 'greyLight',
                })}
                handleComponent={(props) => (
                    <BottomSheetHandle
                        {...props}
                        indicatorStyle={{ backgroundColor: 'white' }}
                    />
                )}
            >
                <View
                    sx={{
                        height: contentHeightForFirstSnapPoint,
                    }}
                >
                    <FlatList
                        testID="change-emitting-device-bottom-sheet-flat-list"
                        data={userContext.devices}
                        renderItem={({ item: { deviceID, name } }) => {
                            const isDeviceEmitting =
                                deviceID ===
                                context.userRelatedInformation
                                    ?.emittingDeviceID;
                            const isThisDeviceMe =
                                userContext.currDeviceID === deviceID;
                            const deviceLabel = `${name}${
                                isThisDeviceMe ? ' (This device)' : ''
                            }`;

                            return (
                                <View
                                    sx={{
                                        flex: 1,
                                        padding: 'm',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: 'greyLight',
                                        borderRadius: 's',
                                    }}
                                >
                                    <TouchableOpacity
                                        onPress={() => {
                                            sendToMachine({
                                                type: 'CHANGE_EMITTING_DEVICE',
                                                deviceID,
                                            });
                                        }}
                                        testID={`${deviceID}-device-card`}
                                    >
                                        <View
                                            sx={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                color: 'white',
                                            }}
                                        >
                                            <Text
                                                sx={{
                                                    color: 'white',
                                                }}
                                            >
                                                {deviceLabel}
                                            </Text>
                                            {isDeviceEmitting && (
                                                <Foundation
                                                    name="volume"
                                                    accessibilityLabel={`${name} is emitting`}
                                                    style={sx({
                                                        fontSize: 's',
                                                        color: 'white',
                                                        padding: 's',
                                                    })}
                                                />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            );
                        }}
                        keyExtractor={(item) => item.deviceID}
                        ListEmptyComponent={() => {
                            return (
                                <View>
                                    <Text>Couldn't find any device</Text>
                                </View>
                            );
                        }}
                        contentContainerStyle={{
                            paddingBottom: insets.bottom,
                        }}
                        style={{
                            flex: 1,
                        }}
                    />
                </View>
            </BottomSheetModal>
        </View>
    );
};

export default SettingsTab;
