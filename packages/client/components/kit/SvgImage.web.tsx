import React from 'react';
import { Image } from 'react-native';
import { SvgImageProps } from './SvgImage.contract';

const SvgImage: React.FC<SvgImageProps> = ({
    uri,
    accessibilityLabel,
    style,
}) => {
    return (
        <Image
            source={{
                uri,
            }}
            accessibilityLabel={accessibilityLabel}
            style={style}
        />
    );
};

export default SvgImage;
