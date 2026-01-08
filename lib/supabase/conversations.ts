import { supabase } from './client';
import type { Conversation, Message, SourceCitation } from './types';

/**
 * Get all conversations for the current user
 */
export async function getUserConversations(collectionId?: string) {
  let query = supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });

  if (collectionId) {
    query = query.eq('collection_id', collectionId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Conversation[];
}

/**
 * Get a conversation with its messages
 */
export async function getConversationWithMessages(id: string) {
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (convError) throw convError;

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (msgError) throw msgError;

  return {
    ...conversation,
    messages: messages as Message[],
  };
}

/**
 * Create a new conversation
 */
export async function createConversation(
  conversation: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('conversations')
    .insert(conversation)
    .select()
    .single();

  if (error) throw error;
  return data as Conversation;
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  message: Omit<Message, 'id' | 'created_at'>
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      ...message,
      conversation_id: conversationId,
    })
    .select()
    .single();

  if (error) throw error;

  // Update conversation's updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data as Message;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  id: string,
  title: string
) {
  const { data, error } = await supabase
    .from('conversations')
    .update({
      title,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Conversation;
}

/**
 * Delete a conversation (cascades to messages)
 */
export async function deleteConversation(id: string) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

