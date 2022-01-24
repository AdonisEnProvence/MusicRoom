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
    testIDPrefix?: 'mtv' | 'mpe';
    onPress?: () => void;
    Actions?: () => React.ReactElement;
}

function formatTestIDForTrackCardContainer({
    trackID,
    testIDPrefix,
}: {
    trackID: string;
    testIDPrefix?: string;
}) {
    return [testIDPrefix, trackID, 'track-card-container']
        .filter((chunk) => chunk !== undefined)
        .join('-');
}

const TrackListItem: React.FC<TrackListItemProps> = ({
    title,
    artistName,
    disabled,
    trackID,
    testIDPrefix,
    accessibilityLabel,
    onPress,
    Actions,
}) => {
    return (
        <View
            testID={formatTestIDForTrackCardContainer({
                trackID,
                testIDPrefix,
            })}
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
