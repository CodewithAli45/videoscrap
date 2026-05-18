# 1. Base Image with Node.js
FROM node:20-bookworm-slim

# 2. Install system dependencies: Python3, curl, and FFmpeg (needed for media post-processing)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 3. Install the latest official yt-dlp binary globally inside the container
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# 4. Set working directory
WORKDIR /app

# 5. Copy package manifests and install dependencies
COPY package*.json ./
RUN npm ci

# 6. Copy the rest of the application files
COPY . .

# 7. Build the Next.js application
RUN npm run build

# 8. Expose port 3000
EXPOSE 3000

# 9. Start Next.js in production mode
CMD ["npm", "run", "start"]
