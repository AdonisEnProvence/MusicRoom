import { MtvPlayingModes, MtvRoomUsersListElement } from '@musicroom/types';
import { Text, useSx, View } from 'dripsy';
import React from 'react';
import { Switch, TouchableOpacity } from 'react-native';

interface MtvRoomUserListElementSettings {
    selectedUser?: MtvRoomUsersListElement;
    deviceOwnerUser?: MtvRoomUsersListElement;
    toggleHasControlAndDelegationPermission: (
        user: MtvRoomUsersListElement,
    ) => void;
    setAsDelegationOwner: (user: MtvRoomUsersListElement) => void;
    playingMode: MtvPlayingModes;
}

const MtvRoomUserListElementSettings: React.FC<MtvRoomUserListElementSettings> =
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
            return (
                <View>
                    <Text>Error no user was selected</Text>
                </View>
            );
        }

        const deviceOwnerIsRoomCreator = deviceOwnerUser.isCreator;
        const deviceOwnerHasControlAndDelegationPermission =
            deviceOwnerUser.hasControlAndDelegationPermission;
        const userNeitherIsNotCreatorOrHasNoPermission =
            !deviceOwnerIsRoomCreator &&
            !deviceOwnerHasControlAndDelegationPermission;
        if (userNeitherIsNotCreatorOrHasNoPermission) {
            return (
                <View>
                    <Text>Unauthorized</Text>
                </View>
            );
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
                                    marginTop: 'l',
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
                                        padding: 'm',
                                        textAlign: 'center',
                                        backgroundColor: 'greyLighter',
                                        borderRadius: 's',
                                    })}
                                >
                                    <Text
                                        sx={{
                                            color: 'greyLight',
                                            fontSize: 's',
                                        }}
                                    >
                                        Set as delegation owner
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                </View>
            </View>
        );
    };

export default MtvRoomUserListElementSettings;
