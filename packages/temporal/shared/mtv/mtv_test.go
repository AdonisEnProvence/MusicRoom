package shared_mtv_test

import (
	"testing"

	"github.com/AdonisEnProvence/MusicRoom/random"
	shared_mtv "github.com/AdonisEnProvence/MusicRoom/shared/mtv"
	"github.com/bxcodec/faker/v3"
	"github.com/stretchr/testify/suite"
)

type UnitTestSuite struct {
	suite.Suite
}

func (s *UnitTestSuite) Test_TracksMetadataWithScoreSetAllowsDeletion() {
	var (
		set       shared_mtv.TracksMetadataWithScoreSet
		setValues = []shared_mtv.TrackMetadataWithScore{
			{
				TrackMetadata: shared_mtv.TrackMetadata{
					ID:         faker.UUIDHyphenated(),
					Title:      faker.Word(),
					ArtistName: faker.Name(),
					Duration:   random.GenerateRandomDuration(),
				},

				Score: 0,
			},
			{
				TrackMetadata: shared_mtv.TrackMetadata{
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
		[]shared_mtv.TrackMetadataWithScore{
			setValues[0],
		},
		set.Values(),
	)
	s.Equal(1, set.Len())

	// Try to delete an item that does not exist in the set
	set.Delete(setValues[1].ID)

	s.Equal(
		[]shared_mtv.TrackMetadataWithScore{
			setValues[0],
		},
		set.Values(),
	)
	s.Equal(1, set.Len())

	// Delete the last item of the set
	set.Delete(setValues[0].ID)

	s.Equal(
		[]shared_mtv.TrackMetadataWithScore{},
		set.Values(),
	)
	s.Equal(0, set.Len())

	set.Add(setValues[0])

	clone := set.Clone()
	s.Equal(set.Values(), clone.Values())
	s.NotSame(&set.Values()[0], &clone.Values()[0])
}

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}
