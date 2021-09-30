import { useSx } from '@dripsy/core';
import { Entypo } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import UserListItem from './UserListItem';

interface UserListItemWithThreeDotsProps {
    index: number;
    name: string;
    onPress?: () => void;
    threeDotsAccessibilityLabel: string;
    onThreeDotsPress: () => void;
    hideThreeDots: boolean;
}

interface ThreeDotsButtonProps {
    accessibilityLabel: string;
    onPress: () => void;
}

const ThreeDotsButton: React.FC<ThreeDotsButtonProps> = ({
    accessibilityLabel,
    onPress,
}) => {
    const sx = useSx();

    return (
        <TouchableOpacity
            accessibilityLabel={accessibilityLabel}
            onPress={onPress}
        >
            <Entypo
                name="dots-three-vertical"
                size={20}
                style={sx({
                    color: 'secondary',
                })}
            />
        </TouchableOpacity>
    );
};

const UserListItemWithThreeDots: React.FC<UserListItemWithThreeDotsProps> = ({
    index,
    name,
    onPress,
    threeDotsAccessibilityLabel,
    onThreeDotsPress,
    hideThreeDots,
}) => {
    return (
        <UserListItem
            index={index}
            name={name}
            onPress={onPress}
            Actions={() => {
                if (hideThreeDots) {
                    return <></>;
                }
                return (
                    <ThreeDotsButton
                        accessibilityLabel={threeDotsAccessibilityLabel}
                        onPress={onThreeDotsPress}
                    />
                );
            }}
        />
    );
};

export default UserListItemWithThreeDots;
