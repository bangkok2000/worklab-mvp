# MoonScribe Integration Testing Guide

## Prerequisites

1. ✅ Supabase database schema is set up
2. ✅ Supabase package is installed (`@supabase/supabase-js`)
3. ✅ Environment variables are configured in `.env.local`

## Step 1: Verify Environment Variables

Make sure your `.env.local` file contains:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Pinecone
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=worklab-test

# OpenAI
OPENAI_API_KEY=your_openai_key
```

## Step 2: Test Supabase Connection

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000/api/test-supabase
   ```

3. You should see a JSON response like:
   ```json
   {
     "success": true,
     "message": "Supabase connection successful",
     "tests": {
       "connection": true,
       "tables": {
         "profiles": true,
         "collections": true,
         "documents": true,
         "conversations": true,
         "messages": true,
         "api_keys": true,
         "usage_logs": true
       },
       "allTablesExist": true
     }
   }
   ```

## Step 3: Test Document Upload

1. Navigate to `http://localhost:3000`
2. Upload a PDF file
3. Check the browser console for any errors
4. Verify in Supabase:
   - Go to Table Editor → `documents` table
   - You should see a new record (if user is authenticated)
   - Check that `status` is 'ready' and `chunk_count` is populated

**Note:** If you're not authenticated, the document will still upload to Pinecone, but won't be saved to Supabase. This is expected behavior.

## Step 4: Test Chat/Ask Functionality

1. After uploading a document, ask a question
2. Check the browser console for any errors
3. Verify in Supabase:
   - Go to Table Editor → `conversations` table
   - You should see a new conversation record
   - Go to `messages` table
   - You should see both user and assistant messages

## Step 5: Verify Usage Tracking

1. After making some API calls, check Supabase:
   - Go to Table Editor → `usage_logs` table
   - You should see records with:
     - `provider`: 'openai'
     - `operation`: 'embedding' or 'chat'
     - `tokens_used`: number
     - `cost_estimate`: decimal number

## Step 6: Test with Authentication (Optional)

To test with a real user:

1. Create a test user in Supabase Auth
2. Get the auth token
3. Make API calls with the token in the Authorization header:
   ```javascript
   fetch('/api/upload', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`
     },
     body: formData
   })
   ```

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Check that `.env.local` exists and has all required variables
- Restart your dev server after adding environment variables

### Error: "relation does not exist"
- Run the SQL schema again in Supabase SQL Editor
- Make sure you're using the `public` schema

### Error: "permission denied"
- This is expected if RLS is enabled and you're not authenticated
- For testing, you can temporarily disable RLS or use the service role key

### No data appearing in Supabase
- Check browser console for errors
- Verify API routes are being called (check Network tab)
- Make sure you're authenticated if testing with users

## Expected Behavior

### Without Authentication (Current State)
- ✅ Documents upload to Pinecone
- ✅ Questions work and get answers
- ❌ No data saved to Supabase (expected)

### With Authentication (Future)
- ✅ Documents upload to Pinecone
- ✅ Document metadata saved to Supabase
- ✅ Conversations saved to Supabase
- ✅ Usage tracked in Supabase

## Next Steps After Testing

1. Implement user authentication
2. Test with authenticated users
3. Verify RLS policies are working
4. Test BYOK feature (when implemented)

