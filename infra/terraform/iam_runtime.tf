data "google_service_account" "github_actions" {
  account_id = "github-actions"
}

resource "google_artifact_registry_repository_iam_member" "github_actions_writer" {
  repository = google_artifact_registry_repository.tf_repo.name
  location   = var.region
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${data.google_service_account.github_actions.email}"
}
