module "bucket" {
  count  = 3
  source = "./modules/bucket"
}
module "topic" {
  for_each = toset(["events", "alerts", "metrics"])
  source   = "./modules/topic"
  depends_on = [module.bucket]
}
resource "google_pubsub_subscription" "sub" {
  name  = "sub"
  topic = module.topic.topic_name
}
