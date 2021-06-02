import React from 'react';
import { SearchedTrack } from '../../machines/searchTrackMachine';
import { Block, Typo } from '../kit';

type ComponentProps = {
    track: SearchedTrack;
};

const TrackPreview: React.FC<ComponentProps> = ({ track }) => {
    const { title } = track;
    return (
        <Block background={'primary'} noPadding={true}>
            <Typo>{title || 'yes'}</Typo>
        </Block>
    );
};

export default TrackPreview;
