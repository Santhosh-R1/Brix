# Stage 1: Build the Rust application
FROM rust:1-slim-bookworm as builder

# Install necessary build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev build-essential

WORKDIR /app
COPY . .

# Build the daemon crate in release mode
RUN cargo build --release -p daemon

# Stage 2: Create a minimal runtime image
FROM debian:bookworm-slim

# Install OpenSSL and CA certificates (required for external web requests)
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/daemon /app/daemon

# Expose the port your backend runs on (Default 8000/8080)
EXPOSE 8000

# Set environment variables for production
ENV RUST_LOG=info
ENV HOST=0.0.0.0
ENV PORT=8000

# Run the binary
CMD ["./daemon"]
