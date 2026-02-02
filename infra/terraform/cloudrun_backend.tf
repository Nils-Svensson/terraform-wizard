resource "google_cloud_run_v2_service" "backend" {
  name     = "backend-new"
  location = var.region
  deletion_protection = false
  ingress = "INGRESS_TRAFFIC_ALL"

  scaling {
    max_instance_count = 4
  }

  template {

    service_account = google_service_account.backend_runtime.email

    containers {
      image = var.backend_image

      ports {
        container_port = 8080
      }
    }
  }
}

data "google_service_account" "reverse_proxy" {
  account_id = "reverse-proxy"
}

resource "google_cloud_run_v2_service_iam_member" "backend_invoker" {
  project  = var.project_id  
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${data.google_service_account.reverse_proxy.email}"
}
