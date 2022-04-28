package main

import (
	"net/http"
)

func AuthorizationMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authorizationHeaderValue := r.Header.Get("Authorization")

		receivedAuthorizationKeyIsInvalid := authorizationHeaderValue != AdonisTemporalKey
		if receivedAuthorizationKeyIsInvalid {
			http.Error(w, "Forbidden access", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}
