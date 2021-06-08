import { styled } from 'dripsy';
import { Text } from 'react-native';

const Typo = styled(Text)(() => {
    return {
        color: 'text',
        fontSize: 'l',
    };
});

export default Typo;
