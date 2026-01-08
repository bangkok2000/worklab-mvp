import { supabase } from './client';
import type { Document, Collection } from './types';

/**
 * Get all documents for the current user
 */
export async function getUserDocuments(collectionId?: string) {
  let query = supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (collectionId) {
    query = query.eq('collection_id', collectionId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Document[];
}

/**
 * Get a single document by ID
 */
export async function getDocument(id: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Document;
}

/**
 * Create a new document record
 */
export async function createDocument(
  document: Omit<Document, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('documents')
    .insert(document)
    .select()
    .single();

  if (error) throw error;
  return data as Document;
}

/**
 * Update document metadata
 */
export async function updateDocument(
  id: string,
  updates: Partial<Document>
) {
  const { data, error } = await supabase
    .from('documents')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Document;
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  id: string,
  status: 'processing' | 'ready' | 'error',
  chunkCount?: number
) {
  const updates: any = { status };
  if (chunkCount !== undefined) {
    updates.chunk_count = chunkCount;
  }

  return updateDocument(id, updates);
}

/**
 * Get all collections for the current user
 */
export async function getUserCollections() {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Collection[];
}

/**
 * Create a new collection
 */
export async function createCollection(
  collection: Omit<Collection, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('collections')
    .insert(collection)
    .select()
    .single();

  if (error) throw error;
  return data as Collection;
}

/**
 * Delete a collection
 */
export async function deleteCollection(id: string) {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

