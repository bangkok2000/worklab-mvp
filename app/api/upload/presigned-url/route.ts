import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createServerClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Initialize S3 client (works with Cloudflare R2 - S3-compatible)
let s3Client: S3Client | null = null;

const getS3Client = () => {
  if (!s3Client) {
    // Check if R2 credentials are configured
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 storage not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.');
    }

    s3Client = new S3Client({
      region: 'auto', // R2 uses 'auto' region
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
};

export async function POST(req: NextRequest) {
  try {
    const { filename, fileType, fileSize, projectId } = await req.json();
    
    // Validate required fields
    if (!filename || !fileType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, fileType, fileSize' },
        { status: 400 }
      );
    }
    
    // Validate file size (100MB max)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (fileSize > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }
    
    // Get user (optional - for authenticated uploads)
    const supabase = createServerClient();
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (authError) {
        console.warn('[Presigned URL] Auth error (continuing as anonymous):', authError);
        // Continue as anonymous user
      }
    }
    
    // Generate unique file ID
    const fileId = uuidv4();
    const timestamp = Date.now();
    
    // Organize files by user (or anonymous)
    const userPrefix = userId ? `users/${userId}` : 'anonymous';
    const key = `${userPrefix}/${fileId}/${timestamp}-${filename}`;
    
    // Get S3 client
    const client = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'moonscribe-uploads';
    
    // Create pre-signed URL (valid for 1 hour)
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
      Metadata: {
        originalFilename: filename,
        fileSize: fileSize.toString(),
        projectId: projectId || '',
        userId: userId || 'anonymous',
        uploadedAt: new Date().toISOString(),
      },
    });
    
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour expiry
    
    console.log(`[Presigned URL] Generated URL for ${filename} (${(fileSize / (1024 * 1024)).toFixed(2)}MB), key: ${key}`);
    
    return NextResponse.json({
      uploadUrl,
      fileId,
      key,
      expiresIn: 3600, // seconds
    });
  } catch (error: any) {
    console.error('[Presigned URL] Error:', error);
    
    // Check if it's a configuration error
    if (error.message?.includes('not configured')) {
      return NextResponse.json(
        { 
          error: 'Storage service not configured. Please configure Cloudflare R2 credentials.',
          details: error.message 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate upload URL', details: error.message },
      { status: 500 }
    );
  }
}
