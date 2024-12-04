# Step 1: Use an official Node.js runtime as the base image
FROM node:18-alpine

# Step 2: Set the working directory inside the container
WORKDIR /usr/src/app

# Step 3: Copy package.json and package-lock.json
COPY package*.json ./

# Step 4: Install dependencies
RUN npm install

# Step 5: Copy the rest of the application code
COPY . .

# Step 6: Build the TypeScript code
RUN npm run build

# Step 7: Expose the port your app runs on (e.g., 3000)
EXPOSE 3000

# Step 8: Define the command to run your app
CMD ["node", "dist/index.js"]
