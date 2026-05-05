# Terraform Wizard

**Interactive infrastructure visualization from Terraform files**

www.tfwizard.com

Terraform Wizard is a web application that generates **interactive diagrams from Terraform files**, allowing users to **visualize and explore cloud infrastructure** quickly. 
While this is still very much a hobby project, it’s intended to help developers, architects, and others better understand their infrastructure, dependencies, and resource distribution.
>  Note: This project is under active development.
---

![Terraform Wizard Screenshot](https://github.com/user-attachments/assets/41780c63-5b17-4bb8-af42-eeb3ffe02fa8)


## Features

- Interactive diagrams generated from one or several Terraform files
- Dependency mapping between resources
- Filtering by resource category (compute, storage, networking, etc.); currently includes basic support for GCP, AWS and Azure

---

## Roadmap / Coming Soon

- Blast radius visualization for resource impact analysis
- Alternative layout algorithms for diagrams
- Grouping resources by category
- GitHub repository sync for automated Terraform diagram updates
- And more...

---

## Architecture & CI/CD

Terraform Wizard is structured as **three services**:

1. **Frontend** – React/TypeScript single-page application  
2. **Backend** – Go API handling Terraform parsing, graph building and graph analysis  
3. **Proxy** – Go service that authenticates and forwards requests to an IAM-protected backend using Google Cloud identity tokens  

All services are containerized with **Docker** and deployed to **Google Cloud Run**.  

The project includes a **fully automated CI/CD pipeline** powered by **GitHub Actions**:

- Builds, tests, containerizes and deploys services on code push
- Pushes Docker images to **Artifact Registry** 
- Deploys only services that changed using **path-based filtering**
- Manages infrastructure as code via **Terraform**
- Enables rapid iteration while maintaining reproducible deployments

> Note: The test coverage is currently a bit light. Will add more soon.

---
