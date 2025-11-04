# Build stage
FROM oven/bun:1 

WORKDIR /app

# Copy package files
COPY package.json bun.lockb*  ./

# Install dependencies
RUN bun install 

# Copy source code
COPY . .

# Build the application
RUN bun run build


EXPOSE 3000

# Start the application
CMD ["bun", "run", "build/index.js", "--port", "3000"]