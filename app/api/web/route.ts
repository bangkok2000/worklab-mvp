import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { createServerClient } from '@/lib/supabase/client';
import { getBalance, deductCredits, getCreditCost } from '@/lib/supabase/credits';
import { getTeamApiKey } from '@/lib/supabase/teams';
import type { CreditAction } from '@/lib/supabase/types';

// Lazy initialization for Pinecone
let _pinecone: Pinecone | null = null;
const getPinecone = () => {
  if (!_pinecone) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('Missing PINECONE_API_KEY environment variable');
    }
    _pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return _pinecone;
};

const getIndex = () => {
  if (!process.env.PINECONE_INDEX) {
    throw new Error('Missing PINECONE_INDEX environment variable');
  }
  return getPinecone().index(process.env.PINECONE_INDEX);
};

// Validate and normalize URL
function normalizeUrl(url: string): string {
  let normalized = url.trim();
  
  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  
  return normalized;
}

// Check if URL is valid
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Check if it's a YouTube URL (should use YouTube processor instead)
function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

// Clean and extract main content from HTML
function extractContent(html: string, url: string): {
  title: string;
  description: string;
  content: string;
  author: string | null;
  publishedDate: string | null;
  favicon: string | null;
  image: string | null;
} {
  const $ = cheerio.load(html);
  
  // Remove unwanted elements
  const removeSelectors = [
    'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
    'nav', 'footer', 'header', 'aside', 'form',
    '.nav', '.navbar', '.navigation', '.menu', '.sidebar',
    '.footer', '.header', '.advertisement', '.ad', '.ads',
    '.social', '.share', '.sharing', '.related', '.recommended',
    '.comments', '.comment', '#comments', '.newsletter',
    '.cookie', '.popup', '.modal', '.overlay', '.banner',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.skip-link', '.breadcrumb', '.pagination',
  ];
  
  removeSelectors.forEach(selector => {
    $(selector).remove();
  });

  // Extract metadata
  const title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('title').text().trim() ||
                $('h1').first().text().trim() ||
                'Untitled Page';

  const description = $('meta[property="og:description"]').attr('content') ||
                      $('meta[name="description"]').attr('content') ||
                      $('meta[name="twitter:description"]').attr('content') ||
                      '';

  const author = $('meta[name="author"]').attr('content') ||
                 $('meta[property="article:author"]').attr('content') ||
                 $('[rel="author"]').text().trim() ||
                 $('.author').first().text().trim() ||
                 null;

  const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
                        $('time[datetime]').attr('datetime') ||
                        $('meta[name="date"]').attr('content') ||
                        null;

  // Get favicon
  let favicon = $('link[rel="icon"]').attr('href') ||
                $('link[rel="shortcut icon"]').attr('href') ||
                '/favicon.ico';
  
  // Make favicon URL absolute
  if (favicon && !favicon.startsWith('http')) {
    try {
      const base = new URL(url);
      favicon = new URL(favicon, base.origin).href;
    } catch {
      favicon = null;
    }
  }

  // Get featured image
  let image = $('meta[property="og:image"]').attr('content') ||
              $('meta[name="twitter:image"]').attr('content') ||
              $('article img').first().attr('src') ||
              null;

  // Make image URL absolute
  if (image && !image.startsWith('http')) {
    try {
      const base = new URL(url);
      image = new URL(image, base.origin).href;
    } catch {
      image = null;
    }
  }

  // Try to find main content container
  const mainContentSelectors = [
    'article', 'main', '[role="main"]',
    '.post-content', '.article-content', '.entry-content',
    '.content', '.post', '.article', '.story',
    '#content', '#main', '#article',
  ];

  let mainElement = null;
  for (const selector of mainContentSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      mainElement = element;
      break;
    }
  }

  // If no main content found, use body
  if (!mainElement) {
    mainElement = $('body');
  }

  // Extract text content with structure
  const contentParts: string[] = [];
  
  // Get headings and paragraphs with hierarchy
  mainElement.find('h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, code').each((_, element) => {
    const el = $(element);
    const tagName = element.tagName.toLowerCase();
    let text = el.text().trim();
    
    // Skip empty elements
    if (!text || text.length < 10) return;
    
    // Skip if it looks like navigation/UI text
    if (text.match(/^(home|about|contact|sign in|log in|subscribe|share|tweet|follow)/i)) return;
    
    // Format based on tag
    if (tagName.startsWith('h')) {
      const level = parseInt(tagName[1]);
      const prefix = '#'.repeat(level);
      contentParts.push(`\n${prefix} ${text}\n`);
    } else if (tagName === 'li') {
      contentParts.push(`• ${text}`);
    } else if (tagName === 'blockquote') {
      contentParts.push(`> ${text}`);
    } else if (tagName === 'pre' || tagName === 'code') {
      contentParts.push(`\`\`\`\n${text}\n\`\`\``);
    } else {
      contentParts.push(text);
    }
  });

  // Join and clean up content
  let content = contentParts.join('\n');
  
  // Clean up excessive whitespace
  content = content
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // If content is too short, try getting all text from main element
  if (content.length < 200) {
    content = mainElement.text()
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    title: title.substring(0, 200),
    description: description.substring(0, 500),
    content,
    author,
    publishedDate,
    favicon,
    image,
  };
}

// Chunk content into smaller pieces for embedding
interface ContentChunk {
  text: string;
  index: number;
  isHeading: boolean;
}

function chunkContent(content: string, targetChunkSize: number = 1200): ContentChunk[] {
  const chunks: ContentChunk[] = [];
  const paragraphs = content.split(/\n\n+/);
  
  let currentChunk = '';
  let currentIndex = 0;
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    
    // Check if this is a heading
    const isHeading = /^#{1,6}\s/.test(trimmed);
    
    // If adding this paragraph would exceed target size
    if (currentChunk.length + trimmed.length > targetChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        index: currentIndex,
        isHeading: false,
      });
      currentIndex++;
      currentChunk = trimmed + '\n\n';
    } else {
      currentChunk += trimmed + '\n\n';
    }
  }
  
  // Don't forget last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      index: currentIndex,
      isHeading: false,
    });
  }
  
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const { 
      url,
      projectId,
      apiKey, // User-provided API key (optional - for BYOK)
    } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Normalize and validate URL
    const normalizedUrl = normalizeUrl(url);
    
    if (!isValidUrl(normalizedUrl)) {
      return NextResponse.json({ 
        error: 'Invalid URL format. Please provide a valid web address.' 
      }, { status: 400 });
    }

    // Check if it's YouTube (should use YouTube processor)
    if (isYouTubeUrl(normalizedUrl)) {
      return NextResponse.json({ 
        error: 'This is a YouTube URL. Please use the YouTube processor instead.',
        isYouTube: true,
      }, { status: 400 });
    }

    console.log(`[Web] Processing URL: ${normalizedUrl}`);

    // Get user from Supabase
    const supabase = createServerClient();
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Credit action for web processing
    const creditAction: CreditAction = 'process_web';
    let creditCost = 0;
    
    // Determine API key source (priority: user BYOK > team key > server credits)
    let openaiKey: string | null = null;
    let keySource: 'byok' | 'team' | 'credits' = 'credits';
    let teamName: string | null = null;
    const serverOpenAIKey = process.env.OPENAI_API_KEY;
    
    // 1. Check for user-provided BYOK key (highest priority)
    if (apiKey) {
      openaiKey = apiKey;
      keySource = 'byok';
      console.log('[Web] Using BYOK (user-provided) key');
    }
    // 2. Check for team API key
    else if (userId) {
      const teamResult = await getTeamApiKey(userId);
      if (teamResult.hasKey && teamResult.apiKey) {
        openaiKey = teamResult.apiKey;
        keySource = 'team';
        teamName = teamResult.teamName;
        console.log(`[Web] Using Team API key from "${teamName}"`);
      }
    }
    
    // 3. If no BYOK or team key, use credits mode
    if (!openaiKey) {
      if (!serverOpenAIKey) {
        return NextResponse.json({ 
          error: 'Server AI not configured. Please use BYOK mode (add your API key in Settings) or join a team.' 
        }, { status: 503 });
      }
      
      if (!userId) {
        return NextResponse.json({ 
          error: 'Please sign in to use credits, add your own API key, or join a team.' 
        }, { status: 401 });
      }
      
      // Get credit cost for this action
      creditCost = await getCreditCost(creditAction);
      
      // Check if user has enough credits
      const balance = await getBalance(userId);
      if (balance < creditCost) {
        return NextResponse.json({ 
          error: `Insufficient credits. You need ${creditCost} credits but have ${balance}. Buy more credits, use your own API key, or join a team.`,
          creditsNeeded: creditCost,
          currentBalance: balance,
        }, { status: 402 });
      }
      
      openaiKey = serverOpenAIKey;
      keySource = 'credits';
      console.log(`[Web] Credits mode: User ${userId} has ${balance} credits, action costs ${creditCost}`);
    }
    
    if (!openaiKey) {
      return NextResponse.json({ 
        error: 'No API key available. Please add your OpenAI API key in Settings, join a team, or sign in to use credits.' 
      }, { status: 401 });
    }
    
    const isUsingBYOK = keySource !== 'credits';

    // Fetch the web page
    let html: string;
    try {
      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MoonScribe/1.0; +https://moonscribe.app)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        if (response.status === 403) {
          return NextResponse.json({ 
            error: 'Access denied. This website blocks automated access.' 
          }, { status: 400 });
        }
        if (response.status === 404) {
          return NextResponse.json({ 
            error: 'Page not found. Please check the URL.' 
          }, { status: 400 });
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return NextResponse.json({ 
          error: 'This URL does not point to a web page. Only HTML content is supported.' 
        }, { status: 400 });
      }

      html = await response.text();
    } catch (fetchError: any) {
      console.error('[Web] Fetch error:', fetchError);
      return NextResponse.json({ 
        error: `Could not fetch the page: ${fetchError.message}` 
      }, { status: 400 });
    }

    console.log(`[Web] Fetched ${html.length} bytes of HTML`);

    // Extract content
    const extracted = extractContent(html, normalizedUrl);
    
    if (extracted.content.length < 100) {
      return NextResponse.json({ 
        error: 'Could not extract meaningful content from this page. The page might be JavaScript-heavy or require authentication.' 
      }, { status: 400 });
    }

    console.log(`[Web] Extracted: "${extracted.title}" (${extracted.content.length} chars)`);

    // Chunk the content
    const chunks = chunkContent(extracted.content);
    console.log(`[Web] Created ${chunks.length} chunks`);

    // Generate embeddings using OpenAI
    const openai = new OpenAI({ apiKey: openaiKey });
    
    const embeddings = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: chunk.text,
        });
        return response.data[0].embedding;
      })
    );

    console.log(`[Web] Generated ${embeddings.length} embeddings`);

    // Create a unique ID for this page
    const domain = extractDomain(normalizedUrl);
    const pageId = `web-${Buffer.from(normalizedUrl).toString('base64').substring(0, 20)}-${Date.now()}`;

    // Prepare vectors for Pinecone
    // Pinecone doesn't allow null values in metadata - convert to empty strings or omit
    const vectors = chunks.map((chunk, idx) => ({
      id: `${pageId}-chunk-${idx}`,
      values: embeddings[idx],
      metadata: {
        text: chunk.text,
        source: extracted.title,
        source_type: 'web',
        url: normalizedUrl,
        domain: domain,
        // Only include fields that are not null
        ...(extracted.author && { author: extracted.author }),
        ...(extracted.publishedDate && { published_date: extracted.publishedDate }),
        ...(extracted.description && { description: extracted.description }),
        ...(extracted.favicon && { favicon: extracted.favicon }),
        ...(extracted.image && { image: extracted.image }),
        ...(projectId && { project_id: projectId }),
        chunk_index: idx,
        total_chunks: chunks.length,
        processed_at: new Date().toISOString(),
      },
    }));

    // Upsert to Pinecone
    const index = getIndex();
    
    // Batch upsert
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }

    console.log(`[Web] Upserted ${vectors.length} vectors to Pinecone`);

    // Deduct credits if using credits mode (not BYOK)
    let remainingBalance: number | null = null;
    if (!isUsingBYOK && userId && creditCost > 0) {
      try {
        const deductResult = await deductCredits(userId, creditAction, {
          description: `Processed web: "${extracted.title.substring(0, 40)}${extracted.title.length > 40 ? '...' : ''}"`,
          referenceType: 'document',
          referenceId: pageId,
          metadata: { url: normalizedUrl, domain, chunks: chunks.length },
        });
        
        if (deductResult.success) {
          remainingBalance = deductResult.balance;
          console.log(`[Web] Deducted ${creditCost} credits from user ${userId}, remaining: ${remainingBalance}`);
        } else {
          console.error('[Web] Failed to deduct credits:', deductResult.error);
        }
      } catch (deductError) {
        console.error('[Web] Error deducting credits:', deductError);
      }
    }

    return NextResponse.json({
      success: true,
      pageId,
      url: normalizedUrl,
      domain,
      title: extracted.title,
      description: extracted.description,
      author: extracted.author,
      publishedDate: extracted.publishedDate,
      favicon: extracted.favicon,
      image: extracted.image,
      chunksProcessed: chunks.length,
      contentLength: extracted.content.length,
      // Credit usage info (only for credits mode)
      credits: keySource === 'credits' ? {
        used: creditCost,
        remaining: remainingBalance,
      } : undefined,
      mode: keySource,
      teamName: keySource === 'team' ? teamName : undefined,
    });

  } catch (error: any) {
    console.error('[Web] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint to preview a URL before processing
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    const normalizedUrl = normalizeUrl(url);
    
    if (!isValidUrl(normalizedUrl)) {
      return NextResponse.json({ 
        valid: false,
        error: 'Invalid URL format' 
      });
    }

    if (isYouTubeUrl(normalizedUrl)) {
      return NextResponse.json({ 
        valid: false,
        error: 'This is a YouTube URL. Use the YouTube processor.',
        isYouTube: true,
      });
    }

    // Quick fetch to check if page is accessible
    try {
      const response = await fetch(normalizedUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MoonScribe/1.0)',
        },
        redirect: 'follow',
      });

      const domain = extractDomain(normalizedUrl);
      
      return NextResponse.json({
        valid: response.ok,
        url: normalizedUrl,
        domain,
        accessible: response.ok,
        contentType: response.headers.get('content-type'),
      });
    } catch {
      return NextResponse.json({
        valid: true,
        url: normalizedUrl,
        domain: extractDomain(normalizedUrl),
        accessible: false,
        error: 'Could not verify page accessibility',
      });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
