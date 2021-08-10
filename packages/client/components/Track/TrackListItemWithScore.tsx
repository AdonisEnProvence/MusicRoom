import React from 'react';
import { Text, View } from 'dripsy';
import TrackListItem from './TrackListItem';

interface TrackListItemWithScoreProps {
    index: number;
    title: string;
    artistName: string;
    score: number;
    minimumScore: number;
    onPress?: () => void;
}

const TrackListItemWithScore: React.FC<TrackListItemWithScoreProps> = ({
    title,
    artistName,
    index,
    score,
    minimumScore,
    onPress,
}) => {
    const Score = () => (
        <View
            sx={{
                justifyContent: 'center',
                paddingLeft: 's',
            }}
        >
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
            onPress={onPress}
            Actions={Score}
        />
    );
};

export default TrackListItemWithScore;
