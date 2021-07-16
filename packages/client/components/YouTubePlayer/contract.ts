import React from 'react';

export interface PlayerProps {
    height: number;
    width?: number;
    videoId: string;
    playing: boolean;
    onReady?: () => void;
}

export type PlayerComponent = React.ForwardRefExoticComponent<
    PlayerProps & React.RefAttributes<PlayerRef>
>;

export interface PlayerRef {
    getCurrentTime(): Promise<number>;
    getDuration(): Promise<number>;
}
