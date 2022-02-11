import { StyleProp, ImageStyle } from 'react-native';

export interface SvgImageProps {
    uri: string;
    accessibilityLabel: string;
    style?: StyleProp<ImageStyle>;
}
