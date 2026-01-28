# Google Vertex AI Setup for Convex

## Prerequisites
- Google Cloud Project with billing enabled
- Vertex AI API enabled

## Step 1: Create Service Account

```bash
# Set your GCP project ID
export GCP_PROJECT_ID="your-project-id"

# Create service account
gcloud iam service-accounts create shipright-ai \
  --display-name="ShipRight AI Service Account" \
  --project=$GCP_PROJECT_ID

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:shipright-ai@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create ~/shipright-key.json \
  --iam-account=shipright-ai@${GCP_PROJECT_ID}.iam.gserviceaccount.com
```

## Step 2: Extract Credentials

```bash
# Extract client email
cat ~/shipright-key.json | jq -r '.client_email'

# Extract private key (will need to escape newlines)
cat ~/shipright-key.json | jq -r '.private_key'
```

## Step 3: Set Convex Environment Variables

```bash
# Set Google Vertex project
npx convex env set GOOGLE_VERTEX_PROJECT "your-gcp-project-id"

# Set location (default is us-central1)
npx convex env set GOOGLE_VERTEX_LOCATION "us-central1"

# Set service account email
npx convex env set GOOGLE_CLIENT_EMAIL "shipright-ai@your-project.iam.gserviceaccount.com"

# Set private key (paste the entire key including BEGIN/END lines)
npx convex env set GOOGLE_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----
...your key here...
-----END PRIVATE KEY-----"
```

## Step 4: Verify

```bash
# List all Convex environment variables
npx convex env list
```

You should see all four variables set.

## Step 5: Test

Try creating a project again from the dashboard. The interview generation should now work.

---

## Troubleshooting

### Error: "AI_LoadSettingError: Google Vertex project setting is missing"
- Run `npx convex env list` to verify variables are set
- Check that `GOOGLE_VERTEX_PROJECT` matches your GCP project ID exactly

### Error: "Authentication failed"
- Verify the service account has `roles/aiplatform.user` role
- Check that the private key is complete (includes BEGIN/END lines)
- Ensure no extra quotes or escaping in the private key

### Error: "Vertex AI API not enabled"
```bash
gcloud services enable aiplatform.googleapis.com --project=$GCP_PROJECT_ID
```
