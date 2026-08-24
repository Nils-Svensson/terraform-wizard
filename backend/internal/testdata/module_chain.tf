module "vpc" {
  source = "./modules/vpc"
}
module "eks" {
  source     = "./modules/eks"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.subnet_ids
}
resource "helm_release" "apps" {
  name       = "apps"
  chart      = "./charts/apps"
  cluster_id = module.eks.cluster_id
}
