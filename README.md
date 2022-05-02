# MusicRoom

## Application definition

Cross-platform iOS, Android and Web application using React Native (Expo) and Adonis and Temporal within one monorepo.

This project is a 42 school project you can find it [here](docs/en.subject.pdf).

## Music Track vote

![Music Track Vote demo gif](docs/mtv-demo.gif)

A Music Track Vote (MTV) is a collaborative music listening session in which users suggest and vote for tracks to be played.

The creator can define several options during room creation, such as position and time constraints, to only allow users located at a certain place and at certain time to vote.

Creator can choose between two emission modes: _broadcast_ and _direct_. In _broadcast_ mode, all users play the sound. In _direct_ mode, only one user in the room emits sound. This user is defined by the creator or by users with the explicit permission.

Users can play sound on only one of their devices and are free to choose on which one.

It’s also possible to create private MTV rooms that only invited users can join.

When joining a MTV room, depending on their permissions, users should be able to suggest a track, vote for other tracks and control the player (play, pause, play next track).

Users can chat and follow other users in the MTV room.

## Music Playlist Editor

![Music Track Vote demo gif](docs/mpe-demo.gif)

A Music Playlist Editor (MPE) is a real time collaborative playlist.

Users create or join MPE rooms in which they suggest tracks, remove tracks, change tracks order and export the playlist into a MTV.

Users can be member of several MPE rooms at the same time, that are listed in their Library.

When exporting a MPE room into a MTV room, users define the configuration of the MTV room, whose initial tracks are the tracks of the playlist.

## Technical Stack

[See Technical stack →](docs/technical-stack.md)

[See Run in local →](docs/run-in-local.md)
