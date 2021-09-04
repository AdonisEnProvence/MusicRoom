import { Text, View } from 'dripsy';
import React from 'react';
import TrackListItem from './TrackListItem';

interface TrackListItemWithScoreProps {
    index: number;
    title: string;
    artistName: string;
    score: number;
    minimumScore: number;
    disabled: boolean;
    onPress?: () => void;
}

const TrackListItemWithScore: React.FC<TrackListItemWithScoreProps> = ({
    title,
    artistName,
    index,
    score,
    minimumScore,
    disabled,
    onPress,
}) => {
    const Score = () => (
        <View
            sx={{
                justifyContent: 'center',
                paddingLeft: 's',
            }}
        >
            {/*Insert icon here in case of disabled*/}
            <Text sx={{ color: 'greyLighter' }}>
                {score}/{minimumScore}
            </Text>
        </View>
    );

    return (
        <TrackListItem
            title={title}
            artistName={artistName}
            index={index}
            disabled={disabled}
            onPress={onPress}
            Actions={Score}
        />
    );
};

export default TrackListItemWithScore;
