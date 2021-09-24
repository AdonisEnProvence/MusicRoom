import { Text, View, Image } from 'dripsy';
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface UserListItemProps {
    index: number;
    name: string;
    onPress?: () => void;
    Actions?: () => React.ReactElement;
}

const UserListItem: React.FC<UserListItemProps> = ({
    name,
    onPress,
    Actions,
}) => {
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
        >
            <TouchableOpacity
                // disabled={disabled}
                onPress={onPress}
                style={{ flex: 1 }}
            >
                <View sx={{ flexDirection: 'row', alignItems: 'center' }}>
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
                        {name}
                    </Text>
                </View>
            </TouchableOpacity>

            {Actions !== undefined ? <Actions /> : null}
        </View>
    );
};

export default UserListItem;
