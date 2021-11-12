import { AntDesign } from '@expo/vector-icons';
import { TrackMetadataWithScore } from '@musicroom/types';
import { Text, useSx, View } from 'dripsy';
import React from 'react';
import TrackListItem from './TrackListItem';

interface TrackListItemWithScoreProps {
    index: number;
    track: TrackMetadataWithScore;
    minimumScore: number;
    disabled: boolean;
    userHasAlreadyVotedForTrack: boolean;
    onPress?: () => void;
}

const TrackListItemWithScore: React.FC<TrackListItemWithScoreProps> = ({
    index,
    track,
    minimumScore,
    userHasAlreadyVotedForTrack,
    disabled,
    onPress,
}) => {
    const sx = useSx();
    const { artistName, id, title } = track;
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
            {userHasAlreadyVotedForTrack && (
                <AntDesign
                    accessibilityLabel={`You've voted for this track`}
                    name="checkcircle"
                    size={24}
                    style={sx({
                        color: 'secondary',
                    })}
                />
            )}
            <Text sx={{ color: 'greyLighter', paddingLeft: 's' }}>
                {track.score}/{minimumScore}
            </Text>
        </View>
    );

    return (
        <TrackListItem
            title={title}
            artistName={artistName}
            trackID={id}
            index={index}
            disabled={disabled}
            onPress={onPress}
            Actions={Score}
        />
    );
};

export default TrackListItemWithScore;
