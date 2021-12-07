import { Text, View } from 'dripsy';
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface TrackListItemProps {
    index: number;
    title: string;
    trackID: string;
    artistName: string;
    disabled?: boolean;
    accessibilityLabel?: string;
    onPress?: () => void;
    Actions?: () => React.ReactElement;
}

const TrackListItem: React.FC<TrackListItemProps> = ({
    title,
    artistName,
    disabled,
    trackID,
    accessibilityLabel,
    onPress,
    Actions,
}) => {
    return (
        <View
            testID={`${trackID}-track-card-container`}
            sx={{
                flexShrink: 0,
                padding: 'm',
                backgroundColor: 'greyLight',
                opacity: disabled ? 0.8 : 1,
                borderRadius: 's',
                flexDirection: 'row',
            }}
        >
            <TouchableOpacity
                disabled={disabled}
                testID={`${trackID}-track-card`}
                accessibilityLabel={accessibilityLabel}
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
