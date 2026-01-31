
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

      ports {
        container_port = 8080
      }
    }
  }
}
