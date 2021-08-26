package random

import (
	"math/rand"
	"time"
)

type generateRandomDurationOptions struct {
	Minimum int
	Maximum int
}

func GenerateRandomDuration(options ...generateRandomDurationOption) time.Duration {
	randomConfig := generateRandomDurationOptions{
		Minimum: 10,
		Maximum: 20,
	}

	for _, opt := range options {
		opt(&randomConfig)
	}

	return time.Second * time.Duration(rand.Intn(randomConfig.Maximum-randomConfig.Minimum)+randomConfig.Minimum)
}

type generateRandomDurationOption func(*generateRandomDurationOptions)

func WithMinRandomValue(minimum int) generateRandomDurationOption {
	return func(grdo *generateRandomDurationOptions) {
		grdo.Minimum = minimum
	}
}

func WithMaxRandomValue(maximum int) generateRandomDurationOption {
	return func(grdo *generateRandomDurationOptions) {
		grdo.Maximum = maximum
	}
}
