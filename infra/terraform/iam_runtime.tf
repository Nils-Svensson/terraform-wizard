data "google_service_account" "github_actions" {
  account_id = "github-actions"
}

resource "google_artifact_registry_repository_iam_member" "github_actions_writer" {
  repository = google_artifact_registry_repository.tf_repo.name
  location   = var.region
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${data.google_service_account.github_actions.email}"
}

resource "google_service_account" "frontend_runtime" {
  account_id   = "frontend-runtime"
  display_name = "Frontend Cloud Run runtime service account"
}

resource "google_service_account_iam_member" "gha_act_as_frontend" {
  service_account_id = google_service_account.frontend_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${data.google_service_account.github_actions.email}"
}
