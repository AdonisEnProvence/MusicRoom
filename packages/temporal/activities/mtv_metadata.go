package activities

import (
	"adonis-en-provence/music_room/shared"
	"adonis-en-provence/music_room/youtube"
	"context"
	"errors"
	"os"
	"time"

	"github.com/senseyeio/duration"
)

var ErrInvalidGoogleAPIKey = errors.New("invalid Google API key")

func FetchTracksInformationActivity(ctx context.Context, tracksIDs []string) ([]shared.TrackMetadata, error) {
	apiKey := os.Getenv("GOOGLE_API_KEY")
	if apiKey == "" {
		return nil, ErrInvalidGoogleAPIKey
	}

	youtubeResponse, err := youtube.FetchYouTubeVideosInformation(ctx, apiKey, tracksIDs)
	if err != nil {
		return nil, err
	}

	metadata := make([]shared.TrackMetadata, 0, len(tracksIDs))

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

func isoDurationToDuration(d duration.Duration) time.Duration {
	now := time.Now()
	appliedDuration := d.Shift(now)

	return appliedDuration.Sub(now)
}
