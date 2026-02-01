
resource "google_cloud_run_v2_service" "frontend" {
  name     = "frontend-new"
  location = var.region
  deletion_protection = false

  ingress = "INGRESS_TRAFFIC_ALL"

  scaling {
    max_instance_count = 4
  }

  template {

    containers {
      image = var.frontend_image

      env {
        name  = "PROXY_API_URL"
        value = google_cloud_run_v2_service.reverse_proxy.uri
      }
      env {
        name  = "REDEPLOY_AT"
        value = timestamp()
}


      ports {
        container_port = 8080
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name

  role   = "roles/run.invoker"
  member = "allUsers"
}
