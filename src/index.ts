import { CosmosClient } from "@azure/cosmos";
import { BlobServiceClient } from "@azure/storage-blob";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import multer from "multer";
import { FileRecord } from "./models/FileRecord";

const upload = multer({ storage: multer.memoryStorage() });
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

app.use(bodyParser.json({ limit: "1000mb" }));
app.use(bodyParser.urlencoded({ limit: "1000mb", extended: true }));

// Azure Storage Configuration
const storageAccountName =
  process.env.VITE_STORAGE_ACCOUNT_NAME || "linksupstorage";
const sasToken =
  process.env.VITE_AZURE_STORAGE_SAS_TOKEN ||
  "sv=2022-11-02&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2025-12-11T10:45:17Z&st=2024-12-02T02:45:17Z&spr=https,http&sig=lLbKMKqxbYG%2B0IxUJFYU3pV8GYAdSOU3BCEJ57nexRQ%3D";
const blobServiceClient = new BlobServiceClient(
  `https://${storageAccountName}.blob.core.windows.net/?${sasToken}`
);

// Azure Cosmos DB Configuration
const cosmosClient = new CosmosClient({
  endpoint:
    process.env.VITE_COSMOS_DB_ENDPOINT ||
    "https://linksupdb.documents.azure.com:443/",
  key:
    process.env.VITE_COSMOS_DB_KEY ||
    "vWkWvvVNrzmTTXLPMBlIsz4e6iK0MNmBh1gpmQj5Lr1NkfeBMUtPgEFEWw2lPVtHwXlqFkNz9nd9ACDbxsD42w==",
  consistencyLevel: "Session",
});
const databaseId = "linksupdb-sql";
const containerId = "uploads";

// ------ F I L E S -----

// Upload a file and create a record in Cosmos DB
app.post("/files", async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileName, fileType, fileBuffer, userInfo, isPublished } = req.body;

    if (
      !fileName ||
      !fileType ||
      !fileBuffer ||
      !userInfo ||
      isPublished === undefined
    ) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    // Decode the base64-encoded file content
    const fileContent = Buffer.from(fileBuffer, "base64");

    const containerName = "files";
    const containerClient = blobServiceClient.getContainerClient(containerName);

    await containerClient.createIfNotExists();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const uploadedFileName = `${timestamp}_${fileName}`;
    const blobClient = containerClient.getBlockBlobClient(uploadedFileName);
    await blobClient.upload(fileContent, fileContent.length, {
      blobHTTPHeaders: { blobContentType: fileType },
    });

    const blobUrl = blobClient.url;

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
      size: fileContent.length,
      type: fileType,
      author: userInfo.userDetails,
      authorId: userInfo.userId,
      isPublished: isPublished,
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

// Fetch all publicly published files
app.get("/files", async (req: Request, res: Response) => {
  try {
    const { database } = await cosmosClient.databases.createIfNotExists({
      id: databaseId,
    });
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
    });

    const querySpec = {
      query: "SELECT * FROM c WHERE c.isPublished = true",
    };

    const { resources } = await container.items
      .query<FileRecord>(querySpec)
      .fetchAll();

    res.json(resources);
  } catch (error) {
    console.error("Error fetching published files:", error);
    res.status(500).json({ message: "Error fetching files", error });
  }
});

// set the isPublished state of a File
app.put(
  "/files/:fileId",
  async (req: Request, res: Response): Promise<void> => {
    const { fileId } = req.params;
    const { isPublished } = req.body;

    try {
      const { database } = await cosmosClient.databases.createIfNotExists({
        id: databaseId,
      });
      const { container } = await database.containers.createIfNotExists({
        id: containerId,
      });

      const { resource } = await container.item(fileId).read<FileRecord>();

      if (!resource) {
        res.status(404).json({ message: "File not found" });
        return;
      }

      const updatedRessource: FileRecord = {
        ...resource,
        isPublished: isPublished,
      };

      const replaceResponse = await container
        .item(fileId)
        .replace(updatedRessource);

      res.json(updatedRessource);
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ message: "Error updating file", error });
    }
  }
);

app.delete("/files/:fileId", async (req: Request, res: Response) => {
  const { fileId } = req.params;

  try {
    const containerName = "files";
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const blobClient = containerClient.getBlockBlobClient(fileId);
    await blobClient.deleteIfExists();

    const { database } = await cosmosClient.databases.createIfNotExists({
      id: databaseId,
    });
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
    });

    await container.item(fileId).delete();
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ message: "Error deleting file", error });
  }
});

// ------ H E A L T H C H E C K -----
app.get("/", (req: Request, res: Response) => {
  res.send("API is running!");
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    message: "API is running!",
    env: process.env.VITTE_ENV || "local",
    project: "https://github.com/naikibro/links-up-supinfo",
    apiDocumentation:
      "https://god.gw.postman.com/run-collection/36502015-b1b988ba-735b-4981-b63b-590d1aafcebe?action=collection%2Ffork&source=rip_markdown&collection-url=entityId%3D36502015-b1b988ba-735b-4981-b63b-590d1aafcebe%26entityType%3Dcollection%26workspaceId%3Dfe9c7a1e-0780-4df4-84aa-435ab3fc6f00",
    latestImage:
      "https://hub.docker.com/repository/docker/naikibro/linksup/general",
  });
});

// ----- S T A R T - S E R V E R -----
app.listen(port, () => {
  console.log(`API is listening on port ${port}`);
});
