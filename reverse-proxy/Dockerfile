    FROM golang:1.25.3-alpine AS builder
    
    # Set working directory
    WORKDIR /app
    
    # Copy go.mod and go.sum first for caching
    COPY go.mod go.sum ./
    
    # Download dependencies
    RUN go mod download
    
    # Copy proxy code
    COPY reverse-proxy ./reverse-proxy
    
  
    # Build the Go binary
    # Path points to where main.go actually lives
    RUN go build -o /terraform-wizard-proxy ./reverse-proxy

    FROM alpine:3.20
    
    RUN addgroup -S app && adduser -S app -G app
    # Add CA certificates for HTTPS
    RUN apk add --no-cache ca-certificates
    
    # Copy binary from builder stage
    COPY --from=builder /terraform-wizard-proxy /terraform-wizard-proxy

    USER app 

    EXPOSE 8080

    # Set entrypoint
    ENTRYPOINT ["/terraform-wizard-proxy"]
