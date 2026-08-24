module "networking" {
  source = "./modules/networking"
  cidr   = "10.0.0.0/16"
}

resource "aws_instance" "app" {
  ami           = "ami-12345"
  instance_type = "t3.small"
  subnet_id     = module.networking.subnet_id
}
