FROM node:18

# Install ffmpeg + python
RUN apt-get update && apt-get install -y ffmpeg python3 python3-pip

# Install yt-dlp
RUN pip3 install yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install node deps
RUN npm install

# Copy all files
COPY . .

# Create downloads folder
RUN mkdir -p downloads

# Expose port (IMPORTANT: use Railway PORT)
EXPOSE 8080

# Start app
CMD ["node", "server.js"]