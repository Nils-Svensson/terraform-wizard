provider "google" {
  project = "demo-project"
  region  = "us-central1"
}

# ─────────────────────────────
# Networking core
# ─────────────────────────────

resource "google_compute_network" "vpc" {
  name = "main-vpc"
}

resource "google_compute_subnetwork" "subnet" {
  name          = "main-subnet"
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.0.0.0/16"
}

resource "google_compute_firewall" "allow_internal" {
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22", "80"]
  }
}

# ─────────────────────────────
# Compute stack (nested deps!)
# ─────────────────────────────

resource "google_service_account" "app" {
  account_id = "app-sa"
}

resource "google_compute_instance_template" "web" {
  name_prefix  = "web-template-"
  machine_type = "e2-medium"

  disk {
    source_image = "debian-cloud/debian-11"
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.id
  }

  service_account {
    email  = google_service_account.app.email
    scopes = ["cloud-platform"]
  }
}

resource "google_compute_instance_group_manager" "web" {
  base_instance_name = "web"
  target_size       = 3

  version {
    instance_template = google_compute_instance_template.web.id
  }
}

resource "google_compute_autoscaler" "web" {
  target = google_compute_instance_group_manager.web.id
}

# ─────────────────────────────
# Load balancer chain
# ─────────────────────────────

resource "google_compute_health_check" "http" {
  http_health_check {
    port = 80
  }
}

resource "google_compute_backend_service" "backend" {
  health_checks = [google_compute_health_check.http.id]
}

resource "google_compute_url_map" "map" {
  default_service = google_compute_backend_service.backend.id
}

resource "google_compute_target_http_proxy" "proxy" {
  url_map = google_compute_url_map.map.id
}

resource "google_compute_global_forwarding_rule" "http" {
  target = google_compute_target_http_proxy.proxy.id
  port_range = "80"
}

# ─────────────────────────────
# TRUE orphans (should be isolated)
# ─────────────────────────────

resource "google_storage_bucket" "assets" {
  name = "static-assets"
}

resource "google_pubsub_topic" "events" {
  name = "events"
}
