package shared_test

import (
	"testing"

	"github.com/AdonisEnProvence/MusicRoom/random"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/bxcodec/faker/v3"
	"github.com/stretchr/testify/suite"
)

type UnitTestSuite struct {
	suite.Suite
}

func (s *UnitTestSuite) Test_TracksMetadataWithScoreSetAllowsDeletion() {
	var (
		set       shared.TracksMetadataWithScoreSet
		setValues = []shared.TrackMetadataWithScore{
			{
				TrackMetadata: shared.TrackMetadata{
					ID:         faker.UUIDHyphenated(),
					Title:      faker.Word(),
					ArtistName: faker.Name(),
					Duration:   random.GenerateRandomDuration(),
				},

				Score: 0,
			},
			{
				TrackMetadata: shared.TrackMetadata{
					ID:         faker.UUIDHyphenated(),
					Title:      faker.Word(),
					ArtistName: faker.Name(),
					Duration:   random.GenerateRandomDuration(),
				},

				Score: 0,
			},
		}
	)

	set.Add(setValues[0])
	set.Add(setValues[1])

	// Delete the second item of the set
	set.Delete(setValues[1].ID)

	s.Equal(
		[]shared.TrackMetadataWithScore{
			setValues[0],
		},
		set.Values(),
	)
	s.Equal(1, set.Len())

	// Try to delete an item that does not exist in the set
	set.Delete(setValues[1].ID)

	s.Equal(
		[]shared.TrackMetadataWithScore{
			setValues[0],
		},
		set.Values(),
	)
	s.Equal(1, set.Len())

	// Delete the last item of the set
	set.Delete(setValues[0].ID)

	s.Equal(
		[]shared.TrackMetadataWithScore{},
		set.Values(),
	)
	s.Equal(0, set.Len())
}

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}
