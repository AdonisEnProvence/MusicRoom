import { styled } from 'dripsy';
import { View } from 'react-native';
import { BackgroundTerms } from '../../App';

type ComponentProps = {
    noPadding?: boolean;
    background?: BackgroundTerms;
};

const Block = styled(View)((props: ComponentProps) => {
    return {
        flex: 1,
        fontSize: 'l',
        fontWeight: '700',
        padding: props.noPadding ? 'none' : 'l',
        backgroundColor: props.background ? props.background : 'transparent',
    };
});

export default Block;
