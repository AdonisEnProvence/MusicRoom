import React from 'react';
import { Entypo } from '@expo/vector-icons';
import UserListItem from './UserListItem';
import { TouchableOpacity } from 'react-native';
import { useSx } from '@dripsy/core';

interface UserListItemWithThreeDotsProps {
    index: number;
    name: string;
    onPress?: () => void;
    onThreeDotsPress: () => void;
}

interface ThreeDotsButtonProps {
    onPress: () => void;
}

const ThreeDotsButton: React.FC<ThreeDotsButtonProps> = ({ onPress }) => {
    const sx = useSx();

    return (
        <TouchableOpacity onPress={onPress}>
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
    onThreeDotsPress,
}) => {
    return (
        <UserListItem
            index={index}
            name={name}
            onPress={onPress}
            Actions={() => <ThreeDotsButton onPress={onThreeDotsPress} />}
        />
    );
};

export default UserListItemWithThreeDots;
