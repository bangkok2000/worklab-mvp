'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

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
  const { user } = useAuth();
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

  useEffect(() => {
    if (user) {
      loadTeam();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      
      if (data.team) {
        setTeam(data.team);
        // Load members if in a team
        loadMembers();
      } else {
        setTeam(null);
      }
    } catch (e) {
      console.error('Failed to load team:', e);
      setError('Failed to load team data');
    }
    setLoading(false);
  };

  const loadMembers = async () => {
    try {
      const res = await fetch('/api/teams/members');
      const data = await res.json();
      if (data.members) {
        setMembers(data.members);
      }
    } catch (e) {
      console.error('Failed to load members:', e);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true);
    setError(null);
    
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
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
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamCode: joinCode.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to join team');
      } else {
        setShowJoinForm(false);
        setJoinCode('');
        loadTeam();
      }
    } catch (e) {
      setError('Failed to join team');
    }
    setJoining(false);
  };

  const handleUpdateApiKey = async () => {
    if (!updateApiKey.trim()) return;
    setUpdatingKey(true);
    setError(null);
    
    try {
      const res = await fetch('/api/teams/api-key', {
        method: 'PUT',
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
      const res = await fetch(`/api/teams/members?userId=${user?.id}`, {
        method: 'DELETE',
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
      const res = await fetch(`/api/teams/members?userId=${memberId}`, {
        method: 'DELETE',
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
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', color: '#f1f5f9' }}>
          👥 Team Members
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {members.map((member) => (
            <div key={member.id} style={styles.memberRow}>
              <div style={styles.memberAvatar}>
                {member.name?.[0] || member.email[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: 500 }}>
                  {member.name || member.email}
                </p>
                <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
                  {member.role === 'owner' ? '👑 Owner' : 'Member'}
                  {member.id === user?.id && ' (You)'}
                </p>
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
          ))}
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
