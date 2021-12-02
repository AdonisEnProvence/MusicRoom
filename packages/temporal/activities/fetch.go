package activities

import "os"

var (
	ADONIS_ENDPOINT     = os.Getenv("ADONIS_ENDPOINT")
	ADONIS_MTV_ENDPOINT = ADONIS_ENDPOINT + "/temporal/mtv"
)
