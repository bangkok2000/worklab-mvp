'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';

interface Team {
  id: string;
  name: string;
  team_code?: string;
  has_api_key: boolean;
  api_provider: string;
  role: string;
  member_count: number;
  created_at: string;
}

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  joined_at: string | null;
}

export default function TeamSettings() {
  const { user, session } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Forms
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  
  // Create team
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamApiKey, setNewTeamApiKey] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Join team
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  
  // Update API key
  const [updateApiKey, setUpdateApiKey] = useState('');
  const [updatingKey, setUpdatingKey] = useState(false);
  
  // Invite member
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (user) {
      loadTeam();
    } else {
      setLoading(false);
    }
  }, [user]);
  
  // Separate effect for URL params (runs after team loads)
  useEffect(() => {
    // Check for team code in URL (from invite link)
    if (typeof window !== 'undefined' && !loading) {
      const params = new URLSearchParams(window.location.search);
      const teamCodeFromUrl = params.get('teamCode');
      const isInvite = params.get('invite') === 'true';
      
      if (teamCodeFromUrl && !team) {
        // Pre-fill join form with team code
        setJoinCode(teamCodeFromUrl.toUpperCase());
        setShowJoinForm(true);
        
        // Clean up URL
        const url = new URL(window.location.href);
        url.searchParams.delete('teamCode');
        url.searchParams.delete('invite');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }
  }, [loading, team]);

  const loadTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/teams', {
        session,
      });
      const data = await res.json();
      
      if (data.team) {
        setTeam(data.team);
        // Always load members if in a team (for both owners and members)
        await loadMembers();
      } else {
        setTeam(null);
        setMembers([]);
      }
    } catch (e) {
      console.error('Failed to load team:', e);
      setError('Failed to load team data');
    }
    setLoading(false);
  };

  const loadMembers = async () => {
    if (!session || !user) {
      console.warn('[TeamSettings] Cannot load members: missing session or user');
      return;
    }
    try {
      const res = await authenticatedFetch('/api/teams/members', {
        session,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error('[TeamSettings] Failed to load members - HTTP error:', res.status, errorData);
        setMembers([]);
        return;
      }
      
      const data = await res.json();
      if (data.error) {
        console.error('[TeamSettings] Failed to load members - API error:', data.error);
        setMembers([]);
        return;
      }
      if (data.members && Array.isArray(data.members)) {
        // Debug: Log current user and members for verification
        console.log('[TeamSettings] Current user from useAuth():', {
          id: user.id,
          email: user.email,
          rawUser: user,
        });
        console.log('[TeamSettings] Members from API:', data.members.map((m: any) => ({
          id: m.id,
          email: m.email,
          name: m.name,
          role: m.role,
          idType: typeof m.id,
          idString: String(m.id),
        })));
        // Verify which member should show "(You)"
        data.members.forEach((m: any) => {
          const isMatch = user.id && m.id && String(m.id).trim() === String(user.id).trim();
          console.log(`[TeamSettings] Member ${m.email} (${m.id}): matches current user?`, isMatch);
        });
        setMembers(data.members);
      } else {
        console.warn('[TeamSettings] Members data is not an array:', data);
        setMembers([]);
      }
    } catch (e) {
      console.error('[TeamSettings] Failed to load members - Exception:', e);
      setMembers([]);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true);
    setError(null);
    
    try {
      const res = await authenticatedFetch('/api/teams', {
        method: 'POST',
        session,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName.trim(),
          apiKey: newTeamApiKey.trim() || undefined,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to create team');
      } else {
        setTeam(data.team);
        setShowCreateForm(false);
        setNewTeamName('');
        setNewTeamApiKey('');
        loadMembers();
      }
    } catch (e) {
      setError('Failed to create team');
    }
    setCreating(false);
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setError(null);
    
    try {
      console.log('[Join Team Frontend] Attempting to join with code:', joinCode.trim());
      const res = await authenticatedFetch('/api/teams/join', {
        method: 'POST',
        session,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamCode: joinCode.trim() }),
      });
      
      const data = await res.json();
      console.log('[Join Team Frontend] Response:', data);
      
      if (!res.ok) {
        const errorMsg = data.details 
          ? `${data.error}\n\nDetails: ${data.details}${data.hint ? '\n\nHint: ' + data.hint : ''}${data.code ? '\n\nCode: ' + data.code : ''}` 
          : data.error || 'Failed to join team';
        setError(errorMsg);
        console.error('[Join Team Frontend] Error:', errorMsg);
      } else {
        setShowJoinForm(false);
        setJoinCode('');
        loadTeam();
      }
    } catch (e) {
      console.error('[Join Team Frontend] Exception:', e);
      setError('Failed to join team');
    }
    setJoining(false);
  };

  const handleUpdateApiKey = async () => {
    if (!updateApiKey.trim()) return;
    setUpdatingKey(true);
    setError(null);
    
    try {
      const res = await authenticatedFetch('/api/teams/api-key', {
        method: 'PUT',
        session,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: updateApiKey.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to update API key');
      } else {
        setShowApiKeyForm(false);
        setUpdateApiKey('');
        loadTeam();
      }
    } catch (e) {
      setError('Failed to update API key');
    }
    setUpdatingKey(false);
  };

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return;
    
    try {
      const res = await authenticatedFetch(`/api/teams/members?userId=${user?.id}`, {
        method: 'DELETE',
        session,
      });
      
      if (res.ok) {
        setTeam(null);
        setMembers([]);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to leave team');
      }
    } catch (e) {
      setError('Failed to leave team');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the team?')) return;
    
    try {
      const res = await authenticatedFetch(`/api/teams/members?userId=${memberId}`, {
        method: 'DELETE',
        session,
      });
      
      if (res.ok) {
        loadMembers();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to remove member');
      }
    } catch (e) {
      setError('Failed to remove member');
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    if (!session) {
      setError('Please sign in to send invitations');
      return;
    }
    
    setSendingInvite(true);
    setError(null);
    
    try {
      const res = await authenticatedFetch('/api/teams/invite', {
        method: 'POST',
        session,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          role: 'member',
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to send invitation');
      } else {
        setShowInviteModal(false);
        setInviteName('');
        setInviteEmail('');
        alert(`Invitation email sent to ${inviteEmail.trim()}!`);
        // Reload members to show pending invite
        loadMembers();
      }
    } catch (e) {
      setError('Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (!user) {
    return (
      <div style={styles.emptyState}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
        <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Sign in required</h3>
        <p style={{ color: '#64748b' }}>You need to sign in to manage teams</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.emptyState}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <p style={{ color: '#94a3b8' }}>Loading team data...</p>
      </div>
    );
  }

  // Not in a team - show create/join options
  if (!team) {
    return (
      <div style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Team</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Create a team to share your API key with team members, or join an existing team.
          </p>
        </div>

        {error && (
          <div style={styles.error}>{error}</div>
        )}

        {/* Create Team Form */}
        {showCreateForm ? (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Create a New Team</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Team Name</label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g., Research Team"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>OpenAI API Key (optional)</label>
              <input
                type="password"
                value={newTeamApiKey}
                onChange={(e) => setNewTeamApiKey(e.target.value)}
                placeholder="sk-..."
                style={styles.input}
              />
              <p style={styles.hint}>You can add this later in team settings</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowCreateForm(false)} style={styles.secondaryButton}>
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={creating || !newTeamName.trim()}
                style={{
                  ...styles.primaryButton,
                  opacity: creating || !newTeamName.trim() ? 0.5 : 1,
                }}
              >
                {creating ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        ) : showJoinForm ? (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Join a Team</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Team Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="MOON-XXXX-XXXX"
                style={{ ...styles.input, fontFamily: 'monospace', letterSpacing: '0.05em' }}
              />
              <p style={styles.hint}>Get this code from your team leader</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowJoinForm(false)} style={styles.secondaryButton}>
                Cancel
              </button>
              <button
                onClick={handleJoinTeam}
                disabled={joining || !joinCode.trim()}
                style={{
                  ...styles.primaryButton,
                  opacity: joining || !joinCode.trim() ? 0.5 : 1,
                }}
              >
                {joining ? 'Joining...' : 'Join Team'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setShowCreateForm(true)} style={styles.optionCard}>
              <span style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏢</span>
              <span style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Create a Team</span>
              <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>Share your API key with members</span>
            </button>
            <button onClick={() => setShowJoinForm(true)} style={styles.optionCard}>
              <span style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🤝</span>
              <span style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Join a Team</span>
              <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>Enter a team code to join</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // In a team - show team details
  const isOwner = team.role === 'owner';

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Team</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          {isOwner ? 'Manage your team and API key settings.' : 'You are a member of this team.'}
        </p>
      </div>

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      {/* Team Info Card */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.25rem' }}>
              {team.name}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>
              {team.member_count} member{team.member_count !== 1 ? 's' : ''} • {isOwner ? 'Owner' : 'Member'}
            </p>
          </div>
          <span style={{
            padding: '0.25rem 0.625rem',
            background: team.has_api_key ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: team.has_api_key ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '6px',
            color: team.has_api_key ? '#34d399' : '#fbbf24',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}>
            {team.has_api_key ? '✓ API Key Set' : '⚠ No API Key'}
          </span>
        </div>

        {/* Team Code (Owner only) */}
        {isOwner && team.team_code && (
          <div style={styles.codeBox}>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Team Code (share with members)</p>
              <p style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.05em' }}>
                {team.team_code}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(team.team_code!)}
              style={styles.copyButton}
            >
              📋 Copy
            </button>
          </div>
        )}

        {/* API Key Section (Owner only) */}
        {isOwner && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem', color: '#f1f5f9' }}>
              🔑 Team API Key
            </h4>
            {showApiKeyForm ? (
              <div style={styles.innerCard}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>OpenAI API Key</label>
                  <input
                    type="password"
                    value={updateApiKey}
                    onChange={(e) => setUpdateApiKey(e.target.value)}
                    placeholder="sk-..."
                    style={styles.input}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setShowApiKeyForm(false)} style={styles.secondaryButton}>
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateApiKey}
                    disabled={updatingKey || !updateApiKey.trim()}
                    style={{
                      ...styles.primaryButton,
                      opacity: updatingKey || !updateApiKey.trim() ? 0.5 : 1,
                    }}
                  >
                    {updatingKey ? 'Saving...' : 'Save Key'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  {team.has_api_key ? '••••••••••••••••' : 'No API key configured'}
                </span>
                <button onClick={() => setShowApiKeyForm(true)} style={styles.smallButton}>
                  {team.has_api_key ? 'Update' : 'Add Key'}
                </button>
              </div>
            )}
            <p style={styles.hint}>
              This key is encrypted and used by all team members for AI features.
            </p>
          </div>
        )}
      </div>

      {/* Team Members */}
      <div style={{ ...styles.card, marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
            👥 Team Members
          </h4>
          {isOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              style={styles.smallButton}
            >
              ➕ Invite Member
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {!members || members.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
              {loading ? 'Loading members...' : 'No members found'}
            </p>
          ) : (
            members.map((member) => (
              <div key={member.id} style={styles.memberRow}>
                <div style={styles.memberAvatar}>
                  {member.name?.[0] || member.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: 500 }}>
                    {member.name || member.email || `User ${member.id?.substring(0, 8)}`}
                  </p>
                  <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    {member.role === 'owner' ? '👑 Owner' : 'Member'}
                    {(() => {
                      const isCurrentUser = user?.id && member.id && String(member.id).trim() === String(user.id).trim();
                      if (process.env.NODE_ENV === 'development') {
                        console.log('[TeamSettings] Comparing:', {
                          memberId: member.id,
                          memberEmail: member.email,
                          userId: user?.id,
                          userEmail: user?.email,
                          isMatch: isCurrentUser,
                        });
                      }
                      return isCurrentUser ? ' (You)' : '';
                    })()}
                  </p>
                  {member.email && member.name && member.email !== member.name && (
                    <p style={{ color: '#64748b', fontSize: '0.6875rem', marginTop: '0.125rem' }}>
                      {member.email}
                    </p>
                  )}
                </div>
                {isOwner && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    style={styles.removeButton}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Leave Team (Members only) */}
      {!isOwner && (
        <div style={{ marginTop: '1.5rem' }}>
          <button onClick={handleLeaveTeam} style={styles.dangerButton}>
            Leave Team
          </button>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowInviteModal(false)}>
          <div style={{
            width: '100%',
            maxWidth: '450px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '16px',
            overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Invite Team Member</h2>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={styles.label}>Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Doe"
                  style={styles.input}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  style={styles.input}
                />
                <p style={styles.hint}>
                  An invitation email with the team code will be sent to this address.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteName('');
                    setInviteEmail('');
                    setError(null);
                  }}
                  style={styles.secondaryButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvite}
                  disabled={sendingInvite || !inviteName.trim() || !inviteEmail.trim()}
                  style={{
                    ...styles.primaryButton,
                    opacity: (sendingInvite || !inviteName.trim() || !inviteEmail.trim()) ? 0.5 : 1,
                  }}
                >
                  {sendingInvite ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  emptyState: {
    padding: '3rem',
    background: 'rgba(15, 15, 35, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.15)',
    borderRadius: '12px',
    textAlign: 'center',
  },
  card: {
    padding: '1.5rem',
    background: 'rgba(15, 15, 35, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.15)',
    borderRadius: '12px',
  },
  innerCard: {
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#f1f5f9',
    marginBottom: '1rem',
  },
  optionCard: {
    flex: 1,
    padding: '1.5rem',
    background: 'rgba(15, 15, 35, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    color: '#f1f5f9',
    transition: 'all 0.2s',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8125rem',
    color: '#94a3b8',
    marginBottom: '0.375rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '0.9375rem',
    outline: 'none',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.375rem',
  },
  primaryButton: {
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '0.625rem 1.25rem',
    background: 'transparent',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '8px',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  smallButton: {
    padding: '0.375rem 0.75rem',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '6px',
    color: '#c4b5fd',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  dangerButton: {
    padding: '0.625rem 1.25rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#f87171',
    cursor: 'pointer',
  },
  removeButton: {
    padding: '0.25rem 0.5rem',
    background: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '4px',
    color: '#f87171',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  copyButton: {
    padding: '0.5rem 0.75rem',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '6px',
    color: '#c4b5fd',
    fontSize: '0.8125rem',
    cursor: 'pointer',
  },
  codeBox: {
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberRow: {
    padding: '0.75rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  memberAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'white',
  },
  error: {
    padding: '0.75rem 1rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#f87171',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
};
