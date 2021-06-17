package youtube

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
)

type YoutubeVideosListAPIResponse struct {
	Kind  string `json:"kind" validate:"required"`
	Items []struct {
		Kind    string `json:"kind" validate:"required"`
		ID      string `json:"id" validate:"required"`
		Snippet struct {
			Title       string `json:"title" validate:"required"`
			Description string `json:"description" validate:"required"`
			Thumbnails  struct {
				Default struct {
					URL    string `json:"url" validate:"required"`
					Width  int    `json:"width" validate:"required"`
					Height int    `json:"height" validate:"required"`
				} `json:"default" validate:"required"`
			} `json:"thumbnails" validate:"required"`
			ChannelTitle string `json:"channelTitle" validate:"required"`
			CategoryID   string `json:"categoryId"`
		} `json:"snippet" validate:"required"`
		ContentDetails struct {
			Duration string `json:"duration" validate:"required"`
		} `json:"contentDetails" validate:"required"`
	} `json:"items" validate:"required"`
	PageInfo struct {
		TotalResults   int `json:"totalResults" validate:"required"`
		ResultsPerPage int `json:"resultsPerPage" validate:"required"`
	} `json:"pageInfo" validate:"required"`
}

func computeYouTubeVideosEndpointURL(apiKey string, videosIDs []string) string {
	const BaseUrl = "https://youtube.googleapis.com/youtube/v3/videos"
	var PartsToGet = []string{
		"snippet",
		"contentDetails",
	}

	joinedPartsToGet := strings.Join(PartsToGet, ",")
	params := url.Values{
		"part": {joinedPartsToGet},
		"id":   videosIDs,
		"key":  {apiKey},
	}

	// As https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails&id=Ks-_Mh1QhMc&id=9Tfciw7QM3c&key=[API_KEY]
	return BaseUrl + "?" + params.Encode()
}

func FetchYouTubeVideosInformation(ctx context.Context, apiKey string, videosIDs []string) (YoutubeVideosListAPIResponse, error) {
	url := computeYouTubeVideosEndpointURL(apiKey, videosIDs)
	resp, err := http.Get(url)
	if err != nil {
		return YoutubeVideosListAPIResponse{}, err
	}
	defer resp.Body.Close()

	var youtubeResponse YoutubeVideosListAPIResponse

	if err := json.NewDecoder(resp.Body).Decode(&youtubeResponse); err != nil {
		return YoutubeVideosListAPIResponse{}, err
	}

	if err := validate.Struct(youtubeResponse); err != nil {
		return YoutubeVideosListAPIResponse{}, err
	}

	return youtubeResponse, nil
}
