FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* bun.lockb* ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
