package activities

import (
	"context"
	"errors"
	"os"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/AdonisEnProvence/MusicRoom/youtube"
	"github.com/senseyeio/duration"
)

var ErrInvalidGoogleAPIKey = errors.New("invalid Google API key")

func FetchTracksInformationActivity(ctx context.Context, tracksIDs []string) ([]shared.TrackMetadata, error) {
	metadata := make([]shared.TrackMetadata, 0, len(tracksIDs))

	if len(tracksIDs) == 0 {
		return metadata, nil
	}

	apiKey := os.Getenv("GOOGLE_API_KEY")
	if apiKey == "" {
		return nil, ErrInvalidGoogleAPIKey
	}

	youtubeResponse, err := youtube.FetchYouTubeVideosInformation(ctx, apiKey, tracksIDs)
	if err != nil {
		return nil, err
	}

	for _, entry := range youtubeResponse.Items {
		parsedDuration, _ := duration.ParseISO8601(entry.ContentDetails.Duration)

		trackMetadata := shared.TrackMetadata{
			ID:         entry.ID,
			Title:      entry.Snippet.Title,
			ArtistName: entry.Snippet.ChannelTitle,
			Duration:   isoDurationToDuration(parsedDuration),
		}

		metadata = append(metadata, trackMetadata)
	}

	return metadata, nil
}

type FetchedTracksInformationWithInitiator struct {
	Metadata []shared.TrackMetadata
	UserID   string
	DeviceID string
}

func FetchTracksInformationActivityAndForwardInitiator(ctx context.Context, tracksIDs []string, userID string, deviceID string) (FetchedTracksInformationWithInitiator, error) {
	metadata, err := FetchTracksInformationActivity(ctx, tracksIDs)
	if err != nil {
		return FetchedTracksInformationWithInitiator{}, err
	}

	return FetchedTracksInformationWithInitiator{
		Metadata: metadata,
		UserID:   userID,
		DeviceID: deviceID,
	}, nil
}

func isoDurationToDuration(d duration.Duration) time.Duration {
	now := time.Now()
	appliedDuration := d.Shift(now)

	return appliedDuration.Sub(now)
}
