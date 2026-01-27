package main

import (
	"bytes"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
)

const metadataURL = "http://metadata/computeMetadata/v1/instance/service-accounts/default/identity"

func getIdentityToken(audience string) (string, error) {
	req, _ := http.NewRequest("GET", metadataURL+"?audience="+url.QueryEscape(audience), nil)
	req.Header.Set("Metadata-Flavor", "Google")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	return string(b), nil
}

func proxyRequest(w http.ResponseWriter, r *http.Request) {
	backend := os.Getenv("BACKEND_URL")
	if backend == "" {
		http.Error(w, "BACKEND_URL not set", 500)
		return
	}

	token, err := getIdentityToken(backend)
	if err != nil {
		http.Error(w, "failed to get identity token", 500)
		return
	}

	target := backend + r.URL.Path
	if r.URL.RawQuery != "" {
		target += "?" + r.URL.RawQuery
	}

	body, _ := io.ReadAll(r.Body)
	req, _ := http.NewRequest(r.Method, target, bytes.NewReader(body))
	req.Header = r.Header.Clone()
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, err.Error(), 502)
		return
	}
	defer resp.Body.Close()

	for k, v := range resp.Header {
		w.Header()[k] = v
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func main() {
	http.HandleFunc("/api/", proxyRequest)
	log.Println("Proxy listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
