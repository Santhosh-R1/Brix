# Stage 1: Build the Rust application
FROM rust:1-slim-bookworm as builder

# Install necessary build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev build-essential

WORKDIR /app
COPY . .

# Create a dummy dist folder so rust-embed compiles successfully
RUN mkdir -p /dist && echo "API Server Running" > /dist/index.html

# Build the daemon crate in release mode
RUN cargo build --release -p openprix

# Stage 2: Create a minimal runtime image
FROM debian:bookworm-slim

# Install OpenSSL and CA certificates (required for external web requests)
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/openprix /app/openprix

# Expose the port your backend runs on (Default 8000/8080)
EXPOSE 8000

# Set environment variables for production
ENV RUST_LOG=info
ENV HOST=0.0.0.0
ENV PORT=8000

# Run the binary
CMD ["./openprix"]
