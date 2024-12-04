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

## Run the API

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
