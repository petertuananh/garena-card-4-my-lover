FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source
COPY . .

# Expose port 2911
EXPOSE 2911

# Start the application
CMD ["node", "server.js"]

