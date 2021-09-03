import { styled } from 'dripsy';
import { TextInput as RNTextInput } from 'react-native';

const TextField = styled(RNTextInput)(() => ({
    flex: 1,
    padding: 'm',
    borderWidth: 0,
    borderRadius: 's',
    color: 'text',
    backgroundColor: 'greyLight',
    fontSize: 's',
}));

export default TextField;
