import { google } from 'googleapis';
import { readFileSync } from 'fs';
import config from '../config.js';
import logger from '../utils/logger.js';

let driveClient;
let docsClient;

/**
 * Initialize Google APIs with service account credentials.
 */
function getAuth() {
  const keyFile = JSON.parse(readFileSync(config.google.serviceAccountKeyPath, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
    ],
  });
  driveClient = google.drive({ version: 'v3', auth });
  docsClient = google.docs({ version: 'v1', auth });
  return { driveClient, docsClient };
}

/**
 * Create a subfolder inside the parent Clients folder.
 * @param {string} folderName — e.g. "Acme Plumbing"
 * @returns {string} folder ID
 */
export async function createClientFolder(folderName) {
  if (!driveClient) getAuth();

  // Check if folder already exists
  const existing = await driveClient.files.list({
    q: `name='${folderName.replace(/'/g, "\\'")}' and '${config.google.driveParentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (existing.data.files.length > 0) {
    logger.info({ folderName, folderId: existing.data.files[0].id }, 'Google Drive → folder already exists');
    return existing.data.files[0].id;
  }

  const folder = await driveClient.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [config.google.driveParentFolderId],
    },
    fields: 'id',
  });

  logger.info({ folderName, folderId: folder.data.id }, 'Google Drive → folder created');
  return folder.data.id;
}

/**
 * Upload a file (Buffer) to a specific Drive folder.
 * @param {string} fileName
 * @param {Buffer} content
 * @param {string} mimeType
 * @param {string} folderId
 * @returns {{fileId: string, webViewLink: string}}
 */
export async function uploadFile(fileName, content, mimeType, folderId) {
  if (!driveClient) getAuth();

  const { Readable } = await import('stream');
  const stream = new Readable();
  stream.push(content);
  stream.push(null);

  const file = await driveClient.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
  });

  // Make the file accessible via link
  await driveClient.permissions.create({
    fileId: file.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  logger.info({ fileName, fileId: file.data.id }, 'Google Drive → file uploaded');
  return {
    fileId: file.data.id,
    webViewLink: file.data.webViewLink,
  };
}

export default { createClientFolder, uploadFile };
