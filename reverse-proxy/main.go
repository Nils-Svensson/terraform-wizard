package main

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	
)

const (
	metadataURL = "http://metadata/computeMetadata/v1/instance/service-accounts/default/identity"
)

func getIdentityToken(audience string) (string, error) {
	req, _ := http.NewRequest("GET",
		metadataURL+"?audience="+url.QueryEscape(audience), nil)
	req.Header.Set("Metadata-Flavor", "Google")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("metadata server returned %s", resp.Status)
	}

	b, _ := io.ReadAll(resp.Body)
	return string(b), nil
}

func proxyRequest(w http.ResponseWriter, r *http.Request) {

	var backendURL = os.Getenv("BACKEND_URL")
	
	if backendURL == "" {
		http.Error(w, "BACKEND_URL not set", 500)
		return
	}

	token, err := getIdentityToken(backendURL)
	if err != nil {
		http.Error(w, "failed to get identity token", 500)
		return
	}

	
	target := backendURL + r.URL.Path
	if r.URL.RawQuery != "" {
		target += "?" + r.URL.RawQuery
	}

	body, _ := io.ReadAll(r.Body)
	req, _ := http.NewRequest(r.Method, target, bytes.NewReader(body))

	for k, v := range r.Header {
		if k == "Host" {
			continue
		}
		req.Header[k] = v
	}

	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, err.Error(), 502)
		return
	}
	defer resp.Body.Close()

	for k, v := range resp.Header {
		if k == "Transfer-Encoding" || k == "Connection" {
			continue
		}
		w.Header()[k] = v
	}

	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func main() {
	http.HandleFunc("/", proxyRequest)
	log.Println("Proxy listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
