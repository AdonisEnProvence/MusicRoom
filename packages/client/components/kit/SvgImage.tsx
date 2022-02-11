import React from 'react';
import { View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { SvgImageProps } from './SvgImage.contract';

const SvgImage: React.FC<SvgImageProps> = ({
    uri,
    accessibilityLabel,
    style,
}) => {
    return (
        <View style={style}>
            <SvgUri uri={uri} accessibilityLabel={accessibilityLabel} />
        </View>
    );
};

export default SvgImage;
