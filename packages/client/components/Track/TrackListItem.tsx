import { Text, View } from 'dripsy';
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface TrackListItemProps {
    index: number;
    title: string;
    artistName: string;
    disabled?: boolean;
    onPress?: () => void;
    Actions?: () => React.ReactElement;
}

const TrackListItem: React.FC<TrackListItemProps> = ({
    title,
    artistName,
    disabled,
    onPress,
    Actions,
}) => {
    return (
        <View
            sx={{
                flex: 1,
                padding: 'm',
                backgroundColor: disabled ? 'gold' : 'greyLight',
                borderRadius: 's',
                flexDirection: 'row',
            }}
        >
            <TouchableOpacity
                disabled={disabled}
                onPress={onPress}
                style={{ flex: 1 }}
            >
                <View>
                    <Text
                        sx={{
                            color: 'white',
                            marginBottom: 'xs',
                        }}
                    >
                        {title}
                    </Text>

                    <Text
                        sx={{
                            color: 'greyLighter',
                            fontSize: 'xxs',
                        }}
                    >
                        {artistName}
                    </Text>
                </View>
            </TouchableOpacity>

            {Actions !== undefined ? <Actions /> : null}
        </View>
    );
};

export default TrackListItem;
