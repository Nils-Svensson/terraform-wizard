# ---------------------------
# Stage 1 — Build
# ---------------------------
    FROM node:24-alpine AS builder

    WORKDIR /app
    
    # Copy dependency manifests first for caching
    COPY frontend/package.json frontend/package-lock.json ./
    
    # Install deps (reproducible)
    RUN npm ci
    
    # Copy source
    COPY frontend/ ./
    
    # Build static assets
    RUN npm run build
    
    
    # ---------------------------
    # Stage 2 — Runtime (nginx)
    # ---------------------------
    FROM nginx:1.27-alpine
    
    # Remove default config
    RUN rm /etc/nginx/conf.d/default.conf
    
    # Copy custom nginx config
    COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
    
    # Copy built assets
    COPY --from=builder /app/dist /usr/share/nginx/html
    
    # Cloud Run listens on 8080
    EXPOSE 8080
    
    CMD ["nginx", "-g", "daemon off;"]
    