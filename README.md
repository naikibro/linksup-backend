![logo](./docs/images/1.png)

# Linksup API

This project is a Node.js-based RESTful API for uploading files to Azure Blob Storage and managing file records in Azure Cosmos DB. It also includes the ability to fetch files uploaded by a specific user.

## Features

- **File Upload:** Upload files to Azure Blob Storage and store metadata in Azure Cosmos DB.
- **User-specific File Retrieval:** Fetch files uploaded by a specific user.
- **Health Check:** Basic health check endpoint to verify the API is running.

## Prerequisites

- Node.js (v18 or later)
- Azure Blob Storage account
- Azure Cosmos DB account
- Environment variables for configuration

You can use Postman to the import the API documentation from the `/docs` folder

## Run the API locally

You may want to run a local API server for development purposes, you can link the `Linksup frontend` locally to this local API server node. Beware that there is no staging yet ( deployment slots )  
/!\ You are touching `production` storage

1. Clone the repository:

   ```bash
   git clone git@github.com:naikibro/linksup-backend.git
   cd linksup-backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and configure the following variables:

   ```
   VITE_STORAGE_ACCOUNT_NAME=<your-storage-account-name>
   VITE_AZURE_STORAGE_SAS_TOKEN=<your-sas-token>
   VITE_COSMOS_DB_ENDPOINT=<your-cosmos-db-endpoint>
   VITE_COSMOS_DB_KEY=<your-cosmos-db-key>
   ```

4. Start the server:

   ```bash
   npm run build
   npm start
   ```

5. The API will be available at `http://localhost:3000`.

## Deploy the API ( Azure App )

We use a containerized node ExpressJs API, we deploy it to a Container App in Azure

1. **Build the Docker Image:**

   ```bash
   docker buildx build --platform linux/amd64 -t naikibro/linksup:1 .   # this ensures compatibility with Azure container runners, if you build locally on Mac M3 it will fetch arm based image and fail on Azure deployment
   ```

2. **Push the Image to Docker Hub:**

   ```bash
   docker push naikibro/linksup:1
   ```

CD is setup to listen to changes on `naikibro/linksup:1` and redeploy the API

---

Congratulations! You have successfully deployed the Linksup API to Azure App Service using Docker.
