# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY . .

# Expose frontend port (Vite dev server)
EXPOSE 5173

# Start frontend
CMD ["npm", "run", "dev", "--", "--host"]
