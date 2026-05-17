# Document Processing and Validation App

## Overview

This is a document processing and validation application built with **Next.js**, **TypeScript**, **Firebase Firestore**, **Sharp**, and **Tesseract.js**.

The app allows users to upload documents such as invoices, PDFs, images, CSV files, and TXT files. It extracts text from the uploaded document, parses structured invoice data, validates the extracted values, and allows the user to manually review, correct, confirm, reject, or delete the document.

---

## Tech Stack

- Next.js
- React
- TypeScript
- Firebase Admin SDK
- Firestore
- Sharp
- Tesseract.js
- Papa Parse
- Tailwind CSS
- Docker

---

## Features

- Upload PDF, image, CSV, or TXT files
- OCR processing for image-based documents
- PDF text extraction
- CSV and TXT parsing
- Extract document fields:
  - Document type
  - Supplier/company name
  - Document number
  - Issue date
  - Due date
  - Currency
  - Line items
  - Subtotal
  - Tax
  - Total
- Validate extracted data:
  - Missing fields
  - Invalid dates
  - Line item mismatches
  - Subtotal mismatch
  - Total mismatch
  - Multiple total values
  - Duplicate document number
- Manual review and correction
- Confirm document as validated
- Reject document
- Delete document
- Store parsed documents in Firestore
- Store uploaded files in Firestore chunks

---

# Local Setup

## 1. Install dependencies

```bash
npm install
```

---

## 2. Create `.env.local`

⚠️ **Demo Environment Warning**

### This project is a demo project. The environment variables shown below are included only for demo/testing purposes so the reviewer can run the application locally and inside Docker.

Create a `.env.local` file in the project root:

```env
FIREBASE_PROJECT_ID="smart-doc-7db0f"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@smart-doc-7db0f.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCynEQsePzuGiDw\nbsev8Pv1dU3YjmMPZrsamBMVmPsJ8Lz7prDOiOfcLn/oy95sIvI3xqNgjybQLSqw\nvJ5JaXdTfMbB7HW+DcrO11jKOc6hNeqwHkU8HLQf0hr6Of5G8F/xuwBpQ2naPde6\nqjBssRagf+jPNCM2e+YwKbKroJoOgzBKApw7UbeqhCSu/+/knxzjcIrhp2vW8xXE\ntoCTCyWhbx3h7R6mywzrze5SnMAFQ1Ez4XTOZo9TKrAjLM0rxzPkZSGsYETKYREe\nB0HUFT5WGkK64iif/9y/LvMGF7R+/n99uOrhi61XZu/KRgeVz5vQiekym9ADSzt/\nxDt0V/aXAgMBAAECggEABd4AlqNnekeCcyjNx3eiQeHCFmM1rtZVlB3lwUJeu2ix\n6eRZD4J2IginAVXdGcPwx/3u9PzkLgIl0ltyfv/cwHHWB53FumIH76Z++gRPHNhB\nZtqqXztO0XLHRGwDmyn0mji7M+StL/2dvg8u0GCQLo01GnALLhQrhMPXOjBoOczD\nCsIhPvEvHsUTRg83O4TPsMjxokLPz5Iy0OkIQtS5pRHDjx4foYwxALcTbcqS/htm\n+5SDRIR9Jk7sWM/rex6pYYszq1GnJjOMGQrNILK/WOFytZwY2XnktJwEBsmDxA7+\naBTsWqbvcNhIEBn04ngKQ71dd6kxVHec49Hf8QqJXQKBgQDc/sUwfOiRwEXyajmD\nDx9xzY67S2Q+iwWF/5eIrqKsBSjZXHcIs5BQzoKh1NnLB+ZOZwjhBPCyUM8aR2BD\n2/GvkC3mBAJCb7SX6Q9t2NcxWSb6GaNHbD15YR5akGqls+Ka2ltsn/24Ud0WmjUT\nADYz/J58Y0FFwNJJhzB7QFwglQKBgQDO5tE1oTnVRxIsbQdG/eJhgakokavAn72i\nG/w0nRTr8zDjPqWKyBrcMUMdxjL1ivtA9EQm+lfCKLLUTLHsqLRhNJM078ad6Oj2\n8mOF9GZgbhSwBJSzO8v1eLwIPddng34PW8y+dc1dylU9hlDGFBJ9ookUQZwuYVtk\nePOzznRTewKBgQDVJf022SLPgS11tDKoT6u6bdKenwaetCOtrGmRcS6Az7EohGBi\nyh4FckjYoZ02j/X35LTRo5wrwHkgFXupt7eR53P9iBxNy8PZSPaSsjRL6nsHejbb\nqnBYY+2M2AGktK15QeYwDNgAMSUWqcFLBEdDOQH7YxgPmPy54mRGXDr/SQKBgBYg\np2VF7ep6ZF4t9uZHxstI06+MDMNYEi7hMVLrLc6iPqs/CvNRvVWpSxVHGjIagA6N\nUTCd+36/XYjI/wphbJEsz0WNEz/WJfwrJiuwXLaZb0r34nNcxM5m8C0td/kRHg1E\ncxw3exQ5zG39DGxyvxuCo4hwD+UB8oVHTkD/pn87AoGAT4JuN123TzNbmst/khrr\ngullmzCbnnt7ayTjBuk2GdqBPVDYvJwI3Si+JUbylD7Af6NMn0zy0XQ+B1fxWaHP\nuxTftkMQ4FcnMtt+U5f67QutEu78CUCX5uZ6RFMoqvIkHiBVJ7PjCLv2O8qN95JB\nSobRtZ3Pw+dzDitg88+WhZU=\n-----END PRIVATE KEY-----\n"
```

## 3. Run the app locally

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

## 4. Build locally

```bash
npm run build
```

---

## 5. Run production build locally

```bash
npm start
```

---

# Docker Setup

## 1. Required Next.js config

Because the Dockerfile uses Next.js standalone output, make sure `next.config.ts` contains:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

This app uses API routes, Firebase Admin, OCR processing, and server-side logic, so it must run as a server app.

---

## 2. Create `.env.docker`

⚠️ **Demo Environment Warning**

### This project is a demo project. The environment variables shown below are included only for demo/testing purposes so the reviewer can run the application locally and inside Docker.

Create a `.env.docker` file in the project root:

```env
FIREBASE_PROJECT_ID=smart-doc-7db0f
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@smart-doc-7db0f.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCynEQsePzuGiDw\nbsev8Pv1dU3YjmMPZrsamBMVmPsJ8Lz7prDOiOfcLn/oy95sIvI3xqNgjybQLSqw\nvJ5JaXdTfMbB7HW+DcrO11jKOc6hNeqwHkU8HLQf0hr6Of5G8F/xuwBpQ2naPde6\nqjBssRagf+jPNCM2e+YwKbKroJoOgzBKApw7UbeqhCSu/+/knxzjcIrhp2vW8xXE\ntoCTCyWhbx3h7R6mywzrze5SnMAFQ1Ez4XTOZo9TKrAjLM0rxzPkZSGsYETKYREe\nB0HUFT5WGkK64iif/9y/LvMGF7R+/n99uOrhi61XZu/KRgeVz5vQiekym9ADSzt/\nxDt0V/aXAgMBAAECggEABd4AlqNnekeCcyjNx3eiQeHCFmM1rtZVlB3lwUJeu2ix\n6eRZD4J2IginAVXdGcPwx/3u9PzkLgIl0ltyfv/cwHHWB53FumIH76Z++gRPHNhB\nZtqqXztO0XLHRGwDmyn0mji7M+StL/2dvg8u0GCQLo01GnALLhQrhMPXOjBoOczD\nCsIhPvEvHsUTRg83O4TPsMjxokLPz5Iy0OkIQtS5pRHDjx4foYwxALcTbcqS/htm\n+5SDRIR9Jk7sWM/rex6pYYszq1GnJjOMGQrNILK/WOFytZwY2XnktJwEBsmDxA7+\naBTsWqbvcNhIEBn04ngKQ71dd6kxVHec49Hf8QqJXQKBgQDc/sUwfOiRwEXyajmD\nDx9xzY67S2Q+iwWF/5eIrqKsBSjZXHcIs5BQzoKh1NnLB+ZOZwjhBPCyUM8aR2BD\n2/GvkC3mBAJCb7SX6Q9t2NcxWSb6GaNHbD15YR5akGqls+Ka2ltsn/24Ud0WmjUT\nADYz/J58Y0FFwNJJhzB7QFwglQKBgQDO5tE1oTnVRxIsbQdG/eJhgakokavAn72i\nG/w0nRTr8zDjPqWKyBrcMUMdxjL1ivtA9EQm+lfCKLLUTLHsqLRhNJM078ad6Oj2\n8mOF9GZgbhSwBJSzO8v1eLwIPddng34PW8y+dc1dylU9hlDGFBJ9ookUQZwuYVtk\nePOzznRTewKBgQDVJf022SLPgS11tDKoT6u6bdKenwaetCOtrGmRcS6Az7EohGBi\nyh4FckjYoZ02j/X35LTRo5wrwHkgFXupt7eR53P9iBxNy8PZSPaSsjRL6nsHejbb\nqnBYY+2M2AGktK15QeYwDNgAMSUWqcFLBEdDOQH7YxgPmPy54mRGXDr/SQKBgBYg\np2VF7ep6ZF4t9uZHxstI06+MDMNYEi7hMVLrLc6iPqs/CvNRvVWpSxVHGjIagA6N\nUTCd+36/XYjI/wphbJEsz0WNEz/WJfwrJiuwXLaZb0r34nNcxM5m8C0td/kRHg1E\ncxw3exQ5zG39DGxyvxuCo4hwD+UB8oVHTkD/pn87AoGAT4JuN123TzNbmst/khrr\ngullmzCbnnt7ayTjBuk2GdqBPVDYvJwI3Si+JUbylD7Af6NMn0zy0XQ+B1fxWaHP\nuxTftkMQ4FcnMtt+U5f67QutEu78CUCX5uZ6RFMoqvIkHiBVJ7PjCLv2O8qN95JB\nSobRtZ3Pw+dzDitg88+WhZU=\n-----END PRIVATE KEY-----\n
```

## 5. Build Docker image

```bash
docker build -t document-processing-app .
```

---

## 6. Run Docker container

```bash
docker run --rm \
  --name document-processing-app \
  -p 3000:3000 \
  --env-file .env.docker \
  document-processing-app
```

Open:

```txt
http://localhost:3000
```

---

# API Documentation

Base URL when running locally:

```txt
http://localhost:3000
```

Base URL when running with Docker:

```txt
http://localhost:3000
```

Production URL:

```txt
PASTE_YOUR_DEPLOYED_URL_HERE
```

---

## Frontend Routes

| Route | Description |
|---|---|
| `/` | Home page with links to upload page and dashboard |
| `/upload` | Upload page for PDF, image, CSV, and TXT documents |
| `/dashboard` | Dashboard page showing uploaded documents and validation status |
| `/documents/:id` | Document review page for viewing, editing, confirming, rejecting, or deleting a document |

---

## API Routes

---

## Health Check

Checks if the API is running and verifies Firestore connection.

```http
GET /api/health
```

### Success Response

```json
{
  "ok": true,
  "firebaseConnected": true,
  "data": {
    "ok": true,
    "checkedAt": "2026-05-17T12:00:00.000Z"
  }
}
```

---

## Get All Documents

Returns all stored documents.

```http
GET /api/documents
```

### Success Response

```json
{
  "documents": [
    {
      "id": "document-id",
      "documentType": "invoice",
      "supplierName": "Example Company",
      "documentNumber": "INV-001",
      "issueDate": "2026-05-17",
      "dueDate": "2026-05-30",
      "currency": "USD",
      "lineItems": [],
      "subtotal": 1000,
      "tax": 100,
      "total": 1100,
      "originalFileName": "invoice.png",
      "fileType": "image/png",
      "originalFileSize": 204800,
      "hasOriginalFile": true,
      "rawText": "Extracted OCR text...",
      "status": "validated",
      "validationIssues": [],
      "createdAt": "2026-05-17T12:00:00.000Z",
      "updatedAt": "2026-05-17T12:00:00.000Z"
    }
  ]
}
```

---

## Upload Document

Uploads a document, extracts text, parses structured data, validates it, stores the original file, and saves the processed document in Firestore.

```http
POST /api/documents/upload
```

### Content Type

```txt
multipart/form-data
```

### Form Data

| Field | Type | Required | Description |
|---|---|---:|---|
| `file` | File | Yes | PDF, image, CSV, or TXT file |

### Upload Limit

Maximum file size:

```txt
5MB
```

### Example Request

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -F "file=@invoice.png"
```

### Success Response

Status:

```txt
201 Created
```

```json
{
  "document": {
    "id": "document-id",
    "documentType": "invoice",
    "supplierName": "Example Company",
    "documentNumber": "INV-001",
    "issueDate": "2026-05-17",
    "dueDate": "2026-05-30",
    "currency": "USD",
    "lineItems": [
      {
        "description": "Flyer Design",
        "quantity": 3,
        "unitPrice": 300,
        "amount": 900
      }
    ],
    "subtotal": 900,
    "tax": 0,
    "total": 900,
    "totalCandidates": [900],
    "originalFileName": "invoice.png",
    "fileType": "image/png",
    "originalFileSize": 204800,
    "hasOriginalFile": true,
    "rawText": "Extracted OCR text...",
    "status": "validated",
    "validationIssues": [],
    "createdAt": "2026-05-17T12:00:00.000Z",
    "updatedAt": "2026-05-17T12:00:00.000Z"
  }
}
```

### Error Response: No File Uploaded

Status:

```txt
400 Bad Request
```

```json
{
  "message": "No file was uploaded."
}
```

### Error Response: File Too Large

Status:

```txt
400 Bad Request
```

```json
{
  "message": "File is too large for this demo. Please upload a file smaller than 5MB."
}
```

### Error Response: Processing Failed

Status:

```txt
500 Internal Server Error
```

```json
{
  "message": "Failed to process uploaded document."
}
```

---

## Get Single Document

Returns one document by ID.

```http
GET /api/documents/:id
```

### Example Request

```bash
curl http://localhost:3000/api/documents/document-id
```

### Success Response

```json
{
  "document": {
    "id": "document-id",
    "documentType": "invoice",
    "supplierName": "Example Company",
    "documentNumber": "INV-001",
    "issueDate": "2026-05-17",
    "dueDate": "2026-05-30",
    "currency": "USD",
    "lineItems": [
      {
        "description": "Flyer Design",
        "quantity": 3,
        "unitPrice": 300,
        "amount": 900
      }
    ],
    "subtotal": 900,
    "tax": 0,
    "total": 900,
    "status": "needs_review",
    "validationIssues": []
  }
}
```

### Error Response

Status:

```txt
404 Not Found
```

```json
{
  "message": "Document not found."
}
```

---

## Update Document

Updates a document after manual review. The request body should contain the corrected extracted document data.

```http
PATCH /api/documents/:id
```

### Content Type

```txt
application/json
```

### Request Body

```json
{
  "documentType": "invoice",
  "supplierName": "Corrected Supplier",
  "documentNumber": "INV-001",
  "issueDate": "2026-05-17",
  "dueDate": "2026-05-30",
  "currency": "USD",
  "lineItems": [
    {
      "description": "Flyer Design",
      "quantity": 3,
      "unitPrice": 300,
      "amount": 900
    }
  ],
  "subtotal": 900,
  "tax": 0,
  "total": 900,
  "totalCandidates": [900]
}
```

### Success Response

```json
{
  "document": {
    "id": "document-id",
    "documentType": "invoice",
    "supplierName": "Corrected Supplier",
    "documentNumber": "INV-001",
    "issueDate": "2026-05-17",
    "dueDate": "2026-05-30",
    "currency": "USD",
    "lineItems": [
      {
        "description": "Flyer Design",
        "quantity": 3,
        "unitPrice": 300,
        "amount": 900
      }
    ],
    "subtotal": 900,
    "tax": 0,
    "total": 900,
    "status": "validated",
    "validationIssues": []
  }
}
```

### Error Response

Status:

```txt
404 Not Found
```

```json
{
  "message": "Document not found."
}
```

---

## Delete Document

Deletes a document by ID.

```http
DELETE /api/documents/:id
```

### Example Request

```bash
curl -X DELETE http://localhost:3000/api/documents/document-id
```

### Success Response

```json
{
  "ok": true,
  "id": "document-id"
}
```

### Error Response

Status:

```txt
404 Not Found
```

```json
{
  "message": "Document not found."
}
```

---

## Delete Document Using POST

This route also deletes a document. It can be useful when calling delete actions from forms or clients that use POST actions.

```http
POST /api/documents/:id/delete
```

### Example Request

```bash
curl -X POST http://localhost:3000/api/documents/document-id/delete
```

### Success Response

```json
{
  "ok": true,
  "id": "document-id"
}
```

### Error Response

Status:

```txt
404 Not Found
```

```json
{
  "message": "Document not found."
}
```

---

## Confirm Document

Marks a document as validated.

```http
PATCH /api/documents/:id/confirm
```

### Example Request

```bash
curl -X PATCH http://localhost:3000/api/documents/document-id/confirm
```

### Success Response

```json
{
  "document": {
    "id": "document-id",
    "status": "validated"
  }
}
```

### Error Response

Status:

```txt
404 Not Found
```

```json
{
  "message": "Document not found."
}
```

---

## Reject Document

Marks a document as rejected.

```http
PATCH /api/documents/:id/reject
```

### Example Request

```bash
curl -X PATCH http://localhost:3000/api/documents/document-id/reject
```

### Success Response

```json
{
  "document": {
    "id": "document-id",
    "status": "rejected"
  }
}
```

### Error Response

Status:

```txt
404 Not Found
```

```json
{
  "message": "Document not found."
}
```

---

## Get Original Uploaded File

Returns the original uploaded file for preview or download.

```http
GET /api/documents/:id/file
```

### Example Request

```bash
curl http://localhost:3000/api/documents/document-id/file
```

### Success Response

Returns binary file data.

Response headers include:

```txt
Content-Type: original uploaded file type
Content-Length: original file size
Content-Disposition: inline; filename="original-file-name"
Cache-Control: private, max-age=60
```

### Error Response: Document Not Found

Status:

```txt
404 Not Found
```

```json
{
  "message": "Document not found."
}
```

### Error Response: Original File Not Available

Status:

```txt
404 Not Found
```

```json
{
  "message": "Original file was not stored for this document. Re-upload the file to enable preview."
}
```

---

# Data Models

## LineItem

```ts
type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};
```

---

## ExtractedDocument

```ts
type ExtractedDocument = {
  documentType: "invoice" | "purchase_order" | "unknown";
  supplierName?: string;
  documentNumber?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  lineItems: LineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  totalCandidates?: number[];
};
```

---

## ValidationIssue

```ts
type ValidationIssue = {
  type:
    | "missing_field"
    | "invalid_date"
    | "line_item_mismatch"
    | "subtotal_mismatch"
    | "total_mismatch"
    | "multiple_total_values"
    | "duplicate_document_number";
  field?: string;
  message: string;
  severity: "error" | "warning";
};
```

---

## StoredDocument

```ts
type StoredDocument = ExtractedDocument & {
  id: string;
  originalFileName: string;
  fileType: string;
  originalFileSize?: number;
  hasOriginalFile?: boolean;
  rawText: string;
  status: "uploaded" | "needs_review" | "validated" | "rejected";
  validationIssues: ValidationIssue[];
  createdAt: string;
  updatedAt: string;
};
```

---

# Status Values

| Status | Description |
|---|---|
| `uploaded` | Document was uploaded |
| `needs_review` | Document has validation issues or requires manual review |
| `validated` | Document was confirmed or passed validation |
| `rejected` | Document was rejected |

---

# Validation Issue Types

| Type | Description |
|---|---|
| `missing_field` | Required field is missing |
| `invalid_date` | Date value is invalid, or due date is before issue date |
| `line_item_mismatch` | Line item amount does not match quantity multiplied by unit price |
| `subtotal_mismatch` | Subtotal does not match line item total |
| `total_mismatch` | Total does not match subtotal plus tax |
| `multiple_total_values` | Multiple possible total values were found |
| `duplicate_document_number` | A document with the same document number already exists |
```