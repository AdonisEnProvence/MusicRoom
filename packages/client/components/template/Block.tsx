import { styled } from 'dripsy';
import { View } from 'react-native';
import { BackgroundTerms } from '../../App';

type ComponentProps = {
    noPadding?: boolean;
    background?: BackgroundTerms;
};

const Block = styled(View)((props: ComponentProps) => ({
    flex: 1,
    fontSize: 'l',
    fontWeight: '700',
    padding: props.noPadding ? '' : 'l',
    backgroundColor: props.background ? props.background : 'background',
}));

export default Block;
