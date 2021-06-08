import { styled } from 'dripsy';
import { View } from 'react-native';
import { BackgroundTerms } from '../../App';

type ComponentProps = {
    color?: BackgroundTerms;
};

const Hr = styled(View)((props: ComponentProps) => {
    return {
        borderBottomColor: props.color || 'secondary',
        borderBottomWidth: 1,
        paddingBottom: 'xs',
        paddingTop: 'xs',
    };
});

export default Hr;
