import { Entypo } from '@expo/vector-icons';
import { MtvRoomUsersListElement } from '@musicroom/types';
import { useSx } from 'dripsy';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import UserListItem from './UserListItem';

type UserListItemWithThreeDotsProps =
    | {
          loading: true;
      }
    | {
          loading: false;
          index: number;
          onPress?: () => void;
          threeDotsAccessibilityLabel: string;
          onThreeDotsPress: () => void;
          hideThreeDots: boolean;
          user: MtvRoomUsersListElement;
      };

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

const UserListItemWithThreeDots: React.FC<UserListItemWithThreeDotsProps> = (
    props,
) => {
    if (props.loading === true) {
        return <UserListItem loading />;
    }

    const {
        index,
        onPress,
        threeDotsAccessibilityLabel,
        onThreeDotsPress,
        hideThreeDots,
        user,
    } = props;

    return (
        <UserListItem
            loading={false}
            index={index}
            user={user}
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
