variable "project_id" {
  description = "GCP project id"
  type        = string
}

variable "region" {
  description = "Primary region"
  type        = string
  default     = "europe-north1"
}

variable "backend_image" {
  description = "Backend container image"
  type        = string
}

variable "proxy_image" {
  description = "Proxy container image"
  type        = string
}

variable "frontend_image" {
  description = "Frontend container image"
  type        = string
}


