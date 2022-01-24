import { useSelector } from '@xstate/react';
import { Text, View } from 'dripsy';
import React, { useMemo } from 'react';
import { Skeleton } from '@motify/skeleton';
import MtvRoomCreationFormScreen from '../../../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useMpeRoomCreationFormActor } from '../../../hooks/useMusicPlaylistsActor';
import { CreationMpeRoomFormActorRef } from '../../../machines/creationMpeRoomForm';
import TrackListItem from '../../../components/Track/TrackListItem';

interface MusicPlaylistEditorCreationFormConfirmationProps {
    creationFormActor: CreationMpeRoomFormActorRef;
}

const MusicPlaylistEditorCreationFormConfirmation: React.FC<MusicPlaylistEditorCreationFormConfirmationProps> =
    ({ creationFormActor }) => {
        const roomName = useSelector(
            creationFormActor,
            (state) => state.context.roomName,
        );
        const isOpen = useSelector(
            creationFormActor,
            (state) => state.context.isOpen,
        );
        const onlyInvitedUsersCanVote = useSelector(
            creationFormActor,
            (state) => state.context.onlyInvitedUsersCanVote,
        );
        const summarySections = useMemo(() => {
            const baseSections = [
                {
                    title: 'Name of the room',
                    value: roomName,
                },

                {
                    title: 'Opening status of the room',
                    value: isOpen === true ? 'Public' : 'Private',
                },
            ];

            if (isOpen === true) {
                baseSections.push({
                    title: 'Can only invited users vote?',
                    value: onlyInvitedUsersCanVote === true ? 'Yes' : 'No',
                });
            }

            return baseSections;
        }, [isOpen, onlyInvitedUsersCanVote, roomName]);
        const hasFetchedInitialTracksMetadata = useSelector(
            creationFormActor,
            (state) => state.hasTag('hasFetchedInitialTracksInformation'),
        );
        const fetchedInitialTracksMetadata = useSelector(
            creationFormActor,
            (state) => state.context.initialTracksMetadata,
        );
        const initialTracksMetadata =
            hasFetchedInitialTracksMetadata &&
            fetchedInitialTracksMetadata !== undefined
                ? fetchedInitialTracksMetadata
                : undefined;

        function handleGoBack() {
            creationFormActor.send({
                type: 'GO_BACK',
            });
        }

        function handleGoNext() {
            creationFormActor.send({
                type: 'NEXT',
            });
        }

        return (
            <MtvRoomCreationFormScreen
                testID="mtv-room-creation-confirmation-step"
                title="Confirm room creation"
                onBackButtonPress={handleGoBack}
                onNextButtonPress={handleGoNext}
                Content={
                    <>
                        <View sx={{ marginTop: 'xl' }}>
                            {summarySections.map(({ title, value }) => (
                                <View
                                    key={title}
                                    sx={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        marginBottom: 's',
                                    }}
                                >
                                    <Text sx={{ color: 'white' }}>{title}</Text>

                                    <Text sx={{ color: 'white' }}>{value}</Text>
                                </View>
                            ))}

                            <View sx={{ marginTop: 'l' }}>
                                <Text
                                    sx={{ color: 'white', marginBottom: 'm' }}
                                >
                                    The room will be filled with the following
                                    tracks:
                                </Text>

                                <Skeleton colorMode="dark" width="100%">
                                    {initialTracksMetadata !== undefined ? (
                                        <View>
                                            {initialTracksMetadata.map(
                                                (
                                                    { id, title, artistName },
                                                    index,
                                                ) => (
                                                    <TrackListItem
                                                        testIDPrefix="mpe"
                                                        trackID={id}
                                                        index={index}
                                                        key={id}
                                                        title={title}
                                                        artistName={artistName}
                                                    />
                                                ),
                                            )}
                                        </View>
                                    ) : undefined}
                                </Skeleton>
                            </View>
                        </View>
                    </>
                }
            />
        );
    };

const MusicPlaylistEditorCreationFormConfirmationWrapper: React.FC = () => {
    const creationFormActor = useMpeRoomCreationFormActor();

    if (creationFormActor === undefined) {
        return null;
    }

    return (
        <MusicPlaylistEditorCreationFormConfirmation
            creationFormActor={creationFormActor}
        />
    );
};

export default MusicPlaylistEditorCreationFormConfirmationWrapper;
