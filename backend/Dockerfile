# ---------------------------
# Stage 1 — Build binary
# ---------------------------
    FROM golang:1.27-alpine AS builder

    # Install git (needed for some modules)
    RUN apk add --no-cache git
    
    # Set working directory
    WORKDIR /app
    
    # Copy go.mod and go.sum first for caching
    COPY go.mod go.sum ./
    
    # Download dependencies
    RUN go mod download
    
    # Copy backend code
    COPY backend ./backend
    
    # Copy registry files
    COPY backend/data/registries ./data/registries

    # Build the Go binary
    # Path points to where main.go actually lives
    RUN go build -o /terraform-wizard-backend ./backend/cmd/server
    
    # ---------------------------
    # Stage 2 — Minimal runtime
    # ---------------------------
    FROM alpine:3.20
    
    RUN addgroup -S app && adduser -S app -G app
    # Add CA certificates for HTTPS
    RUN apk add --no-cache ca-certificates
    
    # Copy binary from builder stage
    COPY --from=builder /terraform-wizard-backend /terraform-wizard-backend
    COPY --from=builder /app/data/registries /data/registries

    RUN chown -R app:app /data

    USER app 

    HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://localhost:8080/healthz || exit 1


    EXPOSE 8080

    # Set entrypoint
    ENTRYPOINT ["/terraform-wizard-backend"]
    