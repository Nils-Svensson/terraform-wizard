terraform {
  required_version = ">= 1.14"

  backend "gcs" {
    bucket = "tfwizard-terraform-state" 
    prefix = "cloudrun-zone-migration"    # folder inside the bucket
  }
}
