import { MaterialIcons } from '@expo/vector-icons';
import { MtvWorkflowState } from '@musicroom/types';
import { Button, useSx, View } from 'dripsy';
import { TouchableOpacity } from 'react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { useMusicPlayerContext } from '../hooks/musicPlayerHooks';
import { useUserContext } from '../hooks/userHooks';
import { HomeTabHomeScreenScreenProps } from '../types';

const HomeScreen: React.FC<HomeTabHomeScreenScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { sendToMusicPlayerMachine } = useMusicPlayerContext();
    const { sendToUserMachine } = useUserContext();
    const sx = useSx();

    function handleMyProfileIconPress() {
        navigation.navigate('MyProfile', {
            screen: 'MyProfile',
        });
    }

    return (
        <AppScreen>
            <AppScreenHeader
                title="Home"
                insetTop={insets.top}
                HeaderRight={() => {
                    return (
                        <View sx={{ marginLeft: 'xl' }}>
                            <TouchableOpacity
                                onPress={handleMyProfileIconPress}
                            >
                                <MaterialIcons
                                    testID="open-my-profile-page-button"
                                    accessibilityLabel={`Open my profile page`}
                                    name="account-circle"
                                    style={sx({
                                        fontSize: 'm',
                                        color: 'white',
                                        padding: 's',
                                        alignSelf: 'flex-end',
                                    })}
                                    color="black"
                                />
                            </TouchableOpacity>
                        </View>
                    );
                }}
            />

            <AppScreenContainer>
                <Button
                    title="Go to Music Track Vote"
                    onPress={() => {
                        navigation.navigate('MusicTrackVoteSearch');
                    }}
                />

                <Button
                    title="Go to Music Playlist Editor"
                    onPress={() => {
                        navigation.navigate('MusicPlaylistEditorRoomsSearch', {
                            screen: 'MusicPlaylistEditorRoomsSearchModal',
                        });
                    }}
                />

                <Button
                    title="Go settings"
                    onPress={() => {
                        navigation.navigate('Settings');
                    }}
                />
                <Button
                    title="Suggest track modal"
                    onPress={() => {
                        navigation.navigate('SuggestTrack', {
                            screen: 'SuggestTrackModal',
                        });
                    }}
                />
                <Button
                    title="Ask for geoloc"
                    onPress={() => {
                        sendToUserMachine({
                            type: 'REQUEST_DEDUPLICATE_LOCATION_PERMISSION',
                        });
                    }}
                />

                <Button
                    title="known user profile page"
                    onPress={() => {
                        navigation.navigate('UserProfile', {
                            screen: 'UserProfile',
                            params: {
                                userID: '9ed60e96-d5fc-40b3-b842-aeaa75e93972',
                            },
                        });
                    }}
                />

                <Button
                    title="My Settings"
                    onPress={() => {
                        navigation.navigate('MySettings');
                    }}
                />

                <Button
                    title="Inject fake room"
                    onPress={() => {
                        const fakeState: MtvWorkflowState = {
                            currentTrack: {
                                artistName: 'artistName',
                                title: 'title',
                                duration: 1000,
                                elapsed: 1,
                                score: 1,
                                id: 'sDNwx9XYWIs',
                            },
                            name: 'JUST A FAKE ROOM',
                            playing: false,
                            roomCreatorUserID: 'JUST A CREATOR ID',
                            roomID: 'JUST A ROOM ID',
                            playingMode: 'BROADCAST',
                            tracks: null,
                            minimumScoreToBePlayed: 1,
                            isOpen: true,
                            isOpenOnlyInvitedUsersCanVote: false,
                            hasTimeAndPositionConstraints: true,
                            timeConstraintIsValid: null,
                            delegationOwnerUserID: null,
                            userRelatedInformation: {
                                hasControlAndDelegationPermission: true,
                                userFitsPositionConstraint: null,
                                emittingDeviceID: 'EMITTING DEVICE',
                                userID: 'JUST A USER ID',
                                userHasBeenInvited: false,
                                tracksVotedFor: [],
                            },
                            usersLength: 2,
                        };

                        sendToMusicPlayerMachine({
                            type: 'RETRIEVE_CONTEXT',
                            state: fakeState,
                        });
                    }}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default HomeScreen;
