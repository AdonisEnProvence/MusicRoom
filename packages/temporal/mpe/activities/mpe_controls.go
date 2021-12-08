package activities_mpe

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"

	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"

	"github.com/AdonisEnProvence/MusicRoom/activities"
)

var (
	ADONIS_ENDPOINT     = os.Getenv("ADONIS_ENDPOINT")
	ADONIS_MPE_ENDPOINT = ADONIS_ENDPOINT + "/temporal/mpe"
)

func CreationAcknowledgementActivity(_ context.Context, state shared_mpe.MpeRoomExposedState) error {
	marshaledBody, err := json.Marshal(state)
	if err != nil {
		return err
	}

	url := activities.ADONIS_MTV_ENDPOINT + "/mpe-creation-acknowledgement"

	_, err = http.Post(url, "application/json", bytes.NewBuffer(marshaledBody))

	return err
}
