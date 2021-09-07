import { AntDesign } from '@expo/vector-icons';
import { Text, useSx, View } from 'dripsy';
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
    const sx = useSx();
    const Score = () => (
        <View
            sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                paddingLeft: 's',
            }}
        >
            {disabled && (
                <AntDesign
                    name="checkcircle"
                    size={24}
                    style={sx({
                        color: 'secondary',
                    })}
                />
            )}
            <Text sx={{ color: 'greyLighter', paddingLeft: 's' }}>
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
