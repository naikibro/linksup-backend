import { CosmosClient } from "@azure/cosmos";
import { BlobServiceClient } from "@azure/storage-blob";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { FileRecord } from "./models/FileRecord";
import { UserInfo } from "./models/UserInfo";

dotenv.config();
const app = express();
const port = 3000;

app.use(bodyParser.json());

// Azure Storage Configuration
const storageAccountName = process.env.VITE_STORAGE_ACCOUNT_NAME!;
const sasToken = process.env.VITE_AZURE_STORAGE_SAS_TOKEN!;
const blobServiceClient = new BlobServiceClient(
  `https://${storageAccountName}.blob.core.windows.net/?${sasToken}`
);

// Azure Cosmos DB Configuration
const cosmosClient = new CosmosClient({
  endpoint: process.env.VITE_COSMOS_DB_ENDPOINT!,
  key: process.env.VITE_COSMOS_DB_KEY!,
});
const databaseId = "linksupdb-sql";
const containerId = "uploads";

// Upload a file and create a record in Cosmos DB
app.post("/files", async (req: Request, res: Response) => {
  const {
    fileName,
    fileType,
    fileBuffer,
    userInfo,
  }: {
    fileName: string;
    fileType: string;
    fileBuffer: Buffer;
    userInfo: UserInfo;
  } = req.body;

  try {
    const containerName = "files";
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Ensure container exists
    await containerClient.createIfNotExists();

    // Upload the file to Azure Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const uploadedFileName = `${timestamp}_${fileName}`;
    const blobClient = containerClient.getBlockBlobClient(uploadedFileName);
    await blobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: { blobContentType: fileType },
    });

    const blobUrl = blobClient.url;

    // Write file record to Cosmos DB
    const { database } = await cosmosClient.databases.createIfNotExists({
      id: databaseId,
    });
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
    });

    const record: FileRecord = {
      id: uploadedFileName,
      fileName,
      url: blobUrl,
      uploadedAt: new Date().toISOString(),
      size: fileBuffer.length,
      type: fileType,
      author: userInfo.userDetails,
      authorId: userInfo.userId,
    };

    await container.items.create(record);

    res.status(201).json(record);
  } catch (error) {
    console.error("Error uploading file or writing record:", error);
    res
      .status(500)
      .json({ message: "Error uploading file or writing record", error });
  }
});

// Fetch all files for a specific user
app.get("/files/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const { database } = await cosmosClient.databases.createIfNotExists({
      id: databaseId,
    });
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
    });

    const query = {
      query: "SELECT * FROM c WHERE c.authorId = @userId",
      parameters: [{ name: "@userId", value: userId }],
    };

    const { resources } = await container.items
      .query<FileRecord>(query)
      .fetchAll();
    res.json(resources);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: "Error fetching files", error });
  }
});

// Health Check
app.get("/", (req: Request, res: Response) => {
  res.send("API is running!");
});

// Start the server
app.listen(port, () => {
  console.log(`API is listening on port ${port}`);
});
