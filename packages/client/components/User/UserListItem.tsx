import {
    AntDesign,
    Foundation,
    MaterialCommunityIcons,
} from '@expo/vector-icons';
import { MtvRoomUsersListElement } from '@musicroom/types';
import { Image, Text, useSx, View } from 'dripsy';
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface UserListItemProps {
    index: number;
    user: MtvRoomUsersListElement;
    onPress?: () => void;
    Actions?: () => React.ReactElement;
}

const UserListItem: React.FC<UserListItemProps> = ({
    user,
    index,
    onPress,
    Actions,
}) => {
    const sx = useSx();

    return (
        <View
            sx={{
                flex: 1,
                padding: 'm',
                backgroundColor: 'greyLight',
                // opacity: disabled ? 0.8 : 1,
                borderRadius: 's',
                flexDirection: 'row',
                alignItems: 'center',
            }}
            testID={`${user.nickname}-user-card`}
        >
            <TouchableOpacity
                // disabled={disabled}
                onPress={onPress}
                style={{ flex: 1 }}
            >
                <View
                    sx={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <View
                        sx={{
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}
                    >
                        <Image
                            source={{
                                uri: 'https://stately.ai/registry/machines/03107919-a451-4085-9b66-633cd8794164.png',
                            }}
                            sx={{ width: 'm', height: 'm', marginRight: 'm' }}
                        />

                        <Text
                            sx={{
                                color: 'white',
                                marginBottom: 'xs',
                            }}
                        >
                            {user.nickname}
                        </Text>
                        {user.isMe && (
                            <Text
                                sx={{
                                    color: 'white',
                                    marginBottom: 'xs',
                                    padding: 's',
                                }}
                            >
                                (You)
                            </Text>
                        )}
                        {user.isCreator && (
                            <MaterialCommunityIcons
                                name="crown"
                                accessibilityLabel={`${user.nickname} is the room creator`}
                                style={sx({
                                    fontSize: 'm',
                                    color: 'white',
                                    padding: 's',
                                })}
                                color="black"
                            />
                        )}
                    </View>
                    <View
                        sx={{
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}
                    >
                        {user.isDelegationOwner && (
                            <Foundation
                                name="music"
                                accessibilityLabel={`${user.nickname} is the delegation owner`}
                                style={sx({
                                    fontSize: 'm',
                                    color: 'white',
                                    padding: 's',
                                })}
                                color="black"
                            />
                        )}
                        {user.hasControlAndDelegationPermission && (
                            <AntDesign
                                name="star"
                                accessibilityLabel={`${user.nickname} has control and delegation permission`}
                                style={sx({
                                    fontSize: 'm',
                                    color: 'white',
                                    padding: 's',
                                })}
                                color="black"
                            />
                        )}
                    </View>
                </View>
            </TouchableOpacity>

            {Actions !== undefined ? <Actions /> : null}
        </View>
    );
};

export default UserListItem;
