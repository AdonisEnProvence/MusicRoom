import React from 'react';
import { SearchedTrack } from '../../machines/searchTrackMachine';
import Block from '../template/Block';
import Typo from '../template/Typo';

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
