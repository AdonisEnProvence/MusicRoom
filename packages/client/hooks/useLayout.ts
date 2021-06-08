import { ComponentProps, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';

export function useLayout(printLogs: boolean | undefined = false): readonly [
    {
        width: number;
        height: number;
    },
    (event: LayoutChangeEvent) => void,
] {
    const [layout, setLayout] = useState({
        width: 0,
        height: 0,
    });
    const onLayout: ComponentProps<typeof View>['onLayout'] = ({
        nativeEvent,
    }) => {
        if (printLogs === true) {
            console.log('native event', nativeEvent);
        }

        setLayout(nativeEvent.layout);
    };

    return [layout, onLayout] as const;
}
