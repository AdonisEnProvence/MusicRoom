import { styled } from 'dripsy';
import { TextInput as RNTextInput } from 'react-native';

const TextInput = styled(RNTextInput)(() => ({
    flex: 1,
    borderColor: 'secondary',
    borderWidth: 's',
    borderRadius: 's',
    padding: 'm',
    color: 'text',
    fontSize: 's',
}));

export default TextInput;
