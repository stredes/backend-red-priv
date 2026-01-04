# Firebase Integration Setup

## ✅ Integration Completed

Your Firebase service account credentials have been successfully integrated into the backend.

## Configuration Details

- **Project ID**: `huertomobil-17e85`
- **Service Account Email**: `firebase-adminsdk-fbsvc@huertomobil-17e85.iam.gserviceaccount.com`
- **Storage Bucket**: `huertomobil-17e85.appspot.com`
- **Firestore**: Connected
- **Storage**: Connected

## Files Updated

### 1. `.env` (Local Environment Variables)
The actual Firebase credentials are now stored in your `.env` file using individual environment variables:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_STORAGE_BUCKET`

**⚠️ Important**: This file is gitignored and contains sensitive credentials. Never commit it to version control.

### 2. `.env.example` (Template)
Updated to show the correct structure for other developers to set up their own environment.

## Usage

The Firebase configuration in [src/config/firebase.js](src/config/firebase.js) automatically loads credentials from environment variables. The system supports multiple configuration methods:

1. **Individual environment variables** (current setup, best for local development)
2. **JSON service account string** (via `FIREBASE_SERVICE_ACCOUNT_JSON`, best for Vercel/production)
3. **Service account file path** (via `FIREBASE_SERVICE_ACCOUNT_PATH` or `GOOGLE_APPLICATION_CREDENTIALS`)

## Deployment

### For Vercel/Production

When deploying to Vercel or other platforms, you can set the credentials as environment variables in the platform's dashboard.

**Option 1**: Use individual variables (easier to manage)
```
FIREBASE_PROJECT_ID=huertomobil-17e85
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@huertomobil-17e85.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_STORAGE_BUCKET=huertomobil-17e85.appspot.com
```

**Option 2**: Use the complete JSON (single variable)
```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"huertomobil-17e85",...}
```

## Testing

To verify Firebase is working:

```bash
node -e "require('dotenv').config(); const { admin, db } = require('./src/config/firebase'); console.log('Project:', admin.app().options.projectId || process.env.FIREBASE_PROJECT_ID); console.log('Firestore:', db ? 'Connected' : 'Not configured');"
```

Expected output:
```
✅ Firebase initialized successfully!
📦 Project ID: huertomobil-17e85
💾 Firestore: Connected
```

## Security Best Practices

1. ✅ `.env` file is gitignored
2. ✅ Never commit service account credentials to Git
3. ✅ Use environment variables for all sensitive data
4. ⚠️ Rotate credentials periodically in Firebase Console
5. ⚠️ Limit service account permissions to only what's needed

## Support

If you need to regenerate the service account key:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `huertomobil-17e85`
3. Go to Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Update the credentials in your `.env` file
