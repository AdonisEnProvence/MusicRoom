package main

import "github.com/go-playground/validator"

var validate *validator.Validate

func init() {
	validate = validator.New()
}
