# Supabase Setup Guide

**Purpose**: Set up a new Supabase project for the Unified Data Layer

**Estimated Time**: 10 minutes

**Prerequisites**: Supabase account (free tier is fine)

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **Sign In** (or Sign Up if you don't have an account)
3. Click **New Project**
4. Fill in project details:
   - **Name**: `unified-data-layer` (or your preferred name)
   - **Database Password**: Generate a strong password (SAVE THIS - you'll need it)
   - **Region**: Choose closest to you (e.g., `us-east-1`)
   - **Pricing Plan**: Free (sufficient for Phase 1)
5. Click **Create new project**
6. Wait ~2 minutes for project to provision

---

## Step 2: Get API Credentials

Once your project is ready:

1. Go to **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. You'll see two important values:

### Project URL
```
https://your-project-id.supabase.co
```
- Copy this value
- You'll add it to `.env` as `SUPABASE_URL`

### API Keys

You'll see two keys:
- **anon public** - For client-side applications (we WON'T use this)
- **service_role** - For server-side applications (we WILL use this)

**Copy the `service_role` key**:
- It's the longer key labeled "service_role"
- This has admin privileges (keep it secret!)
- You'll add it to `.env` as `SUPABASE_SERVICE_KEY`

---

## Step 3: Enable pgvector Extension

The pgvector extension enables vector similarity search.

1. Go to **Database** in sidebar
2. Click **Extensions**
3. Search for `vector`
4. Find **vector** extension
5. Toggle it **ON** (enable it)
6. Wait a few seconds for it to activate

---

## Step 4: Run Database Schema

Now you'll create the tables and indexes.

1. Go to **SQL Editor** in sidebar
2. Click **New query**
3. Copy the contents of `scripts/database/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Ctrl/Cmd + Enter)
6. Verify: You should see "Success. No rows returned"

**What this creates**:
- `transcripts` table
- `transcript_chunks` table
- Indexes for performance
- pgvector index for semantic search

---

## Step 5: Create Vector Search Function

This creates the RPC function for semantic search.

1. Still in **SQL Editor**, click **New query**
2. Copy the contents of `scripts/database/002_vector_search_function.sql`
3. Paste into the SQL editor
4. Click **Run**
5. Verify: You should see "Success. No rows returned"

**What this creates**:
- `match_transcript_chunks()` function
- Used by the search endpoint to find similar chunks

---

## Step 6: Verify Setup

Let's verify everything is set up correctly.

1. Go to **Table Editor** in sidebar
2. You should see two tables:
   - `transcripts`
   - `transcript_chunks`
3. Click on `transcript_chunks`
4. Verify it has these columns:
   - `id` (uuid)
   - `transcript_id` (uuid)
   - `chunk_index` (int4)
   - `content` (text)
   - `embedding` (vector)
   - `created_at` (timestamptz)

---

## Step 7: Update Local Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your Supabase credentials:
   ```bash
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key-here
   OPENAI_API_KEY=sk-proj-your-key-here  # (Add in next step)
   ```

3. Save the file

**IMPORTANT**: Never commit `.env` to git! It's already in `.gitignore`.

---

## Step 8: Test Connection

Test that your Node.js app can connect to Supabase:

1. Create a test script: `scripts/test-connection.js` (will be created for you)
2. Run: `node scripts/test-connection.js`
3. Expected output: "✓ Supabase connection successful"

---

## Troubleshooting

### "Invalid API key" Error

**Problem**: Connection fails with authentication error

**Solutions**:
- Verify you copied the **service_role** key (not the anon public key)
- Check for extra spaces in `.env` file
- Ensure `SUPABASE_URL` has `https://` prefix
- Try regenerating the service_role key in Supabase dashboard

### "Extension not found: vector"

**Problem**: pgvector extension not enabled

**Solution**:
- Go to Database → Extensions
- Search for "vector"
- Enable the extension
- Wait 30 seconds and try again

### "Relation 'transcripts' does not exist"

**Problem**: Schema not created

**Solution**:
- Go to SQL Editor
- Re-run `scripts/database/001_initial_schema.sql`
- Check for errors in the output
- Verify no syntax errors in the SQL file

### "Function match_transcript_chunks does not exist"

**Problem**: Vector search function not created

**Solution**:
- Go to SQL Editor
- Re-run `scripts/database/002_vector_search_function.sql`
- Verify pgvector extension is enabled first

---

## Security Notes

**Service Role Key**:
- Has FULL admin access to your database
- Never expose in client-side code
- Never commit to git
- Only use server-side (Node.js API)

**Database Password**:
- Needed if you want to connect via psql or other tools
- Not needed for Supabase client library
- Save it somewhere safe (password manager)

**Row Level Security (RLS)**:
- Currently DISABLED (Phase 1 only)
- Will enable in Phase 3
- Until then, API has full access (fine for development)

---

## Next Steps

After Supabase is set up:

1. ✅ Verify connection with test script
2. ✅ Get OpenAI API key (see openai-setup.md)
3. ✅ Continue with Checkpoint 1 build

---

## Supabase Dashboard Quick Reference

**Common Tasks**:
- View data: **Table Editor**
- Run SQL: **SQL Editor**
- Check logs: **Logs** → **Postgres Logs**
- API docs: **Settings** → **API** → **API Docs**
- Usage stats: **Settings** → **Billing** → **Usage**

**Free Tier Limits**:
- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users

This is more than enough for Phase 1-4.

---

## References

- [Supabase Documentation](https://supabase.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
