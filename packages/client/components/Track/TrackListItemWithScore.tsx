import { Text, View } from 'dripsy';
import React from 'react';
import Svg from 'react-native-svg';
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

const SvgComponent = () => {
    return (
        <Svg
            id="Layer_1"
            x="0px"
            y="0px"
            viewBox="0 0 507.2 507.2"
            style={{
                width: '24px',
            }}
        >
            <circle
                style={{
                    fill: '#32BA7C',
                }}
                cx="253.6"
                cy="253.6"
                r="253.6"
            />
            <path
                style={{
                    fill: '#0AA06E',
                }}
                d="M188.8,368l130.4,130.4c108-28.8,188-127.2,188-244.8c0-2.4,0-4.8,0-7.2L404.8,152L188.8,368z"
            />
            <g>
                <path
                    style={{
                        fill: '#FFFFFF',
                    }}
                    d="M260,310.4c11.2,11.2,11.2,30.4,0,41.6l-23.2,23.2c-11.2,11.2-30.4,11.2-41.6,0L93.6,272.8
		c-11.2-11.2-11.2-30.4,0-41.6l23.2-23.2c11.2-11.2,30.4-11.2,41.6,0L260,310.4z"
                />
                <path
                    style={{
                        fill: '#FFFFFF',
                    }}
                    d="M348.8,133.6c11.2-11.2,30.4-11.2,41.6,0l23.2,23.2c11.2,11.2,11.2,30.4,0,41.6l-176,175.2
		c-11.2,11.2-30.4,11.2-41.6,0l-23.2-23.2c-11.2-11.2-11.2-30.4,0-41.6L348.8,133.6z"
                />
            </g>
            <g />
            <g />
            <g />
            <g />
            <g />
            <g />
            <g />
            <g />
            <g />
            <g />
            <g />
            <g />
            <g />
            <g />
            <g />
        </Svg>
    );
};

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
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                paddingLeft: 's',
            }}
        >
            {disabled && SvgComponent()}
            {/*Insert icon here in case of disabled*/}
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
