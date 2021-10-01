import { Text, useSx } from '@dripsy/core';
import { View } from '@motify/components';
import { MtvPlayingModes, MtvRoomUsersListElement } from '@musicroom/types';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Switch } from 'react-native-gesture-handler';

interface MtvRoomUserListElementSettings {
    selectedUser?: MtvRoomUsersListElement;
    deviceOwnerUser?: MtvRoomUsersListElement;
    toggleHasControlAndDelegationPermission: (
        user: MtvRoomUsersListElement,
    ) => void;
    setAsDelegationOwner: (user: MtvRoomUsersListElement) => void;
    playingMode: MtvPlayingModes;
}

const MtvRoomUserListElementSetting: React.FC<MtvRoomUserListElementSettings> =
    ({
        selectedUser,
        deviceOwnerUser,
        playingMode,
        toggleHasControlAndDelegationPermission,
        setAsDelegationOwner,
    }) => {
        const sx = useSx();
        const roomIsInDirectMode =
            playingMode === MtvPlayingModes.Values.DIRECT;
        if (selectedUser === undefined || deviceOwnerUser === undefined) {
            return <View>Error no user was selected</View>;
        }

        const deviceOwnerIsRoomCreator = deviceOwnerUser.isCreator;
        const deviceOwnerHasControlAndDelegationPermission =
            deviceOwnerUser.hasControlAndDelegationPermission;
        const userNeitherIsNotCreatorOrHasNoPermission =
            !deviceOwnerIsRoomCreator &&
            !deviceOwnerHasControlAndDelegationPermission;
        if (userNeitherIsNotCreatorOrHasNoPermission) {
            return <View>Unauthorized</View>;
        }

        const selectedUserIsNotDeviceOwnerUser = !selectedUser.isMe;
        const selectedUserIsTheDelegationOwner = selectedUser.isDelegationOwner;

        return (
            <View
                sx={{
                    flex: 1,
                    padding: 'm',
                    alignItems: 'center',
                }}
            >
                <View
                    sx={{
                        maxWidth: [undefined, 500],
                        width: '100%',
                    }}
                >
                    <Text
                        sx={{
                            color: 'white',
                            marginBottom: 'l',
                            textAlign: 'center',
                        }}
                    >
                        {selectedUser.nickname} settings
                    </Text>

                    {deviceOwnerIsRoomCreator &&
                        selectedUserIsNotDeviceOwnerUser && (
                            <View
                                sx={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Text
                                    sx={{
                                        marginRight: 'l',
                                        color: 'white',
                                    }}
                                >
                                    Has Delegation and Control permission?
                                </Text>

                                <Switch
                                    value={
                                        selectedUser.hasControlAndDelegationPermission
                                    }
                                    onValueChange={() => {
                                        toggleHasControlAndDelegationPermission(
                                            selectedUser,
                                        );
                                        console.log(
                                            'toggle user control and delegation permission !',
                                        );
                                    }}
                                    accessibilityLabel={`${
                                        selectedUser.hasControlAndDelegationPermission ===
                                        true
                                            ? 'Remove'
                                            : 'Set'
                                    } delegation and control permission`}
                                />
                            </View>
                        )}

                    {deviceOwnerHasControlAndDelegationPermission &&
                        roomIsInDirectMode && (
                            <View
                                sx={{
                                    padding: 's',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: 's',
                                    backgroundColor: 'greyLighter',
                                }}
                            >
                                <TouchableOpacity
                                    disabled={selectedUserIsTheDelegationOwner}
                                    onPress={() =>
                                        setAsDelegationOwner(selectedUser)
                                    }
                                    style={sx({
                                        backgroundColor: '#8B0000',
                                        padding: 'l',
                                        borderRadius: 's',
                                        textAlign: 'center',
                                    })}
                                >
                                    <Text> Set as delegation owner</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                </View>
            </View>
        );
    };

export default MtvRoomUserListElementSetting;
