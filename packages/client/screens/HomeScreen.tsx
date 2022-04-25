import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, useSx, View } from 'dripsy';
import { TouchableOpacity } from 'react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreenContainer, AppScreenHeader } from '../components/kit';
import { HomeTabHomeScreenScreenProps } from '../types';
import AppScreenWithMenu from '../components/kit/AppScreenWithMenu';

const HomeScreen: React.FC<HomeTabHomeScreenScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const sx = useSx();

    function handleMyProfileIconPress() {
        navigation.navigate('MyProfile', {
            screen: 'MyProfileIndex',
        });
    }

    function redirectToTracksSearch() {
        navigation.navigate('Search', {
            screen: 'SearchTracks',
        });
    }

    function handleCreateMtvRoom() {
        redirectToTracksSearch();
    }

    function handleJoinMtvRoom() {
        navigation.navigate('MusicTrackVoteSearch');
    }

    function handleCreateMpeRoom() {
        redirectToTracksSearch();
    }

    function handleJoinMpeRoom() {
        navigation.navigate('MusicPlaylistEditorRoomsSearch', {
            screen: 'MusicPlaylistEditorRoomsSearchModal',
        });
    }

    return (
        <AppScreenWithMenu>
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

            <AppScreenContainer testID="home-screen-container">
                <ScrollView sx={{ flex: 1 }}>
                    <View sx={{ marginTop: 'l' }}>
                        <Text
                            sx={{
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: 'l',
                            }}
                        >
                            Welcome to MusicRoom
                        </Text>

                        <Text
                            sx={{
                                color: 'white',
                                marginTop: 'm',
                                fontSize: 's',
                            }}
                        >
                            Listen to music with your friends or create with
                            them the music playlist of your next trip.
                        </Text>
                    </View>

                    <View
                        testID="home-screen-mtv-group"
                        sx={{ marginTop: 'xxl' }}
                    >
                        <Text
                            sx={{
                                color: 'white',
                                fontSize: 'm',
                                fontWeight: 'bold',
                            }}
                        >
                            Music Track Vote
                        </Text>

                        <Text
                            sx={{
                                color: 'white',
                                marginTop: 'm',
                                fontSize: 's',
                            }}
                        >
                            Create a collaborative listening room for your
                            parties as well as your global events! Participants
                            suggest and vote for tracks.
                        </Text>

                        <View
                            sx={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                marginTop: 'l',
                            }}
                        >
                            <TouchableOpacity
                                style={sx({
                                    marginRight: 'l',
                                    marginBottom: 'l',

                                    backgroundColor: 'secondary',
                                    paddingX: 's',
                                    paddingY: 'm',
                                    borderRadius: 's',
                                })}
                                onPress={handleCreateMtvRoom}
                            >
                                <Text
                                    sx={{
                                        color: 'white',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                    }}
                                >
                                    Create a room
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={sx({
                                    marginBottom: 'l',

                                    paddingX: 's',
                                    paddingY: 'm',
                                    backgroundColor: 'greyLighter',
                                    borderRadius: 's',
                                })}
                                onPress={handleJoinMtvRoom}
                            >
                                <Text
                                    sx={{
                                        color: 'greyLight',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Join a room
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View
                        testID="home-screen-mpe-group"
                        sx={{ marginTop: 'xxl', marginBottom: 'xxl' }}
                    >
                        <Text
                            sx={{
                                color: 'white',
                                fontSize: 'm',
                                fontWeight: 'bold',
                            }}
                        >
                            Music Playlist Editor
                        </Text>

                        <Text
                            sx={{
                                color: 'white',
                                marginTop: 'm',
                                fontSize: 's',
                            }}
                        >
                            List your favorite songs in playlists and ask your
                            friends to complete them.
                        </Text>

                        <View
                            sx={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                marginTop: 'l',
                            }}
                        >
                            <TouchableOpacity
                                style={sx({
                                    marginRight: 'l',
                                    marginBottom: 'l',

                                    backgroundColor: 'secondary',
                                    paddingX: 's',
                                    paddingY: 'm',
                                    borderRadius: 's',
                                })}
                                onPress={handleCreateMpeRoom}
                            >
                                <Text
                                    sx={{
                                        color: 'white',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                    }}
                                >
                                    Create a room
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={sx({
                                    marginBottom: 'l',

                                    paddingX: 's',
                                    paddingY: 'm',
                                    backgroundColor: 'greyLighter',
                                    borderRadius: 's',
                                })}
                                onPress={handleJoinMpeRoom}
                            >
                                <Text
                                    sx={{
                                        color: 'greyLight',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Join a room
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </AppScreenContainer>
        </AppScreenWithMenu>
    );
};

export default HomeScreen;
