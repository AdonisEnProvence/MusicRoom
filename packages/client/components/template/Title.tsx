import { styled } from 'dripsy';
import { Text } from 'react-native';
import { BackgroundTerms } from '../../App';

interface Props {
    color?: BackgroundTerms;
}

const Title = styled(Text)((props: Props) => ({
    fontSize: 'l',
    fontWeight: '700',
    color: props.color || 'text',
}));

export default Title;
