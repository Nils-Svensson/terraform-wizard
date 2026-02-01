resource "google_cloud_run_v2_service" "reverse_proxy" {
  name     = "reverse-proxy-new"
  location = var.region
  deletion_protection = false

  ingress = "INGRESS_TRAFFIC_ALL"

  scaling {
    max_instance_count = 4
  }

  template {
    service_account = data.google_service_account.reverse_proxy.email

    containers {
      image = var.proxy_image

      env {
        name  = "BACKEND_URL"
        value = google_cloud_run_v2_service.backend.uri
      }

      ports {
        container_port = 8080
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "reverse_proxy_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.reverse_proxy.name

  role   = "roles/run.invoker"
  member = "allUsers"
}

