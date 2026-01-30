

resource "google_artifact_registry_repository" "tf_repo" {
  location      = var.region
  repository_id = "tfwizard-new-location"
  description   = "Docker image repository for cloud run services" 
  format        = "DOCKER"
}