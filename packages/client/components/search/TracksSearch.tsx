import { useNavigation } from '@react-navigation/core';
import { useMachine } from '@xstate/react';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { searchTrackMachine } from '../../machines/searchTrackMachine';
import Block from '../template/Block';
import FlexRowContainer from '../template/FlexRowContainer';
import MSTextInput from '../template/TextInput';
import Title from '../template/Title';

const TracksSearch: React.FC = () => {
    const [state, send] = useMachine(searchTrackMachine);
    const navigation = useNavigation();
    useEffect(() => {
        if (
            state.matches('fetchedTracks') &&
            state.context.tracks !== undefined
        ) {
            navigation.navigate('SearchTrackResults', {
                tracks: state.context.tracks,
            });
        }
    }, [state, navigation]);

    function sendQuery() {
        send({
            type: 'SEND_REQUEST',
        });
    }

    function handleInputChangeText(searchQuery: string) {
        send({
            type: 'UPDATE_SEARCH_QUERY',
            searchQuery,
        });
    }

    return (
        <Block background="primary">
            <Title>Search a track</Title>
            <FlexRowContainer>
                <MSTextInput
                    placeholderTextColor={'white'}
                    placeholder={'Search a song here...'}
                    onChangeText={handleInputChangeText}
                />

                <TouchableOpacity
                    style={styles.searchSubmitButton}
                    onPress={sendQuery}
                >
                    <Text style={styles.searchSubmitButtonText}>✅</Text>
                </TouchableOpacity>
            </FlexRowContainer>
        </Block>
    );
};

const styles = StyleSheet.create({
    searchSubmitButton: {
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
    },

    searchSubmitButtonText: {
        textAlign: 'center',
        fontSize: 18,
    },
});

export default TracksSearch;
