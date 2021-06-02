import { useNavigation } from '@react-navigation/core';
import React from 'react';
import { SearchedTrack } from '../../machines/searchTrackMachine';
import { Block, Hr, MSFlatList, Title } from '../kit';
import TrackPreview from './TrackPreview';

type ComponentProps = {
    tracks: SearchedTrack[];
};

const TracksSearchResults: React.FC<ComponentProps> = ({ tracks }) => {
    const navigation = useNavigation();
    return (
        <Block background="primary">
            <Title>Results</Title>
            <Hr />
            <MSFlatList<SearchedTrack>
                onPress={(item) => {
                    console.log(item);
                    navigation.navigate('TrackPlayer', {
                        track: item,
                    });
                }}
                data={tracks}
                Item={(item) => <TrackPreview track={item} />}
            />
        </Block>
    );
};

export default TracksSearchResults;
