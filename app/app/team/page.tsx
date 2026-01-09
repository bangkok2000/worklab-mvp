'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending';
  lastActive?: string;
  joinedAt: string;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
  members: string[]; // member IDs
  projects: string[]; // project IDs
  isDefault: boolean;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  targetType: 'member' | 'workspace' | 'project' | 'document';
  timestamp: string;
}

const STORAGE_KEYS = {
  members: 'moonscribe-team-members',
  workspaces: 'moonscribe-team-workspaces',
  activity: 'moonscribe-team-activity',
};

export default function TeamPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'workspaces' | 'activity'>('overview');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div style={{ 
        padding: '2rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '400px',
      }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          Loading...
        </div>
      </div>
    );
  }

  // Show sign-up prompt for guests (user is null and not loading)
  if (!user) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          padding: '3rem',
          background: 'rgba(15, 15, 35, 0.6)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          borderRadius: '20px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            margin: '0 auto 1.5rem',
          }}>
            👥
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem', color: '#f1f5f9' }}>
            Team Collaboration
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '1rem' }}>
            Create an account to collaborate with your team
          </p>
          <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.875rem' }}>
            Invite team members, create workspaces, and share projects together.
          </p>

          <div style={{
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '2rem',
            textAlign: 'left',
          }}>
            <h3 style={{ color: '#c4b5fd', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              With an account you can:
            </h3>
            <ul style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, paddingLeft: '1.25rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>Invite team members via email</li>
              <li style={{ marginBottom: '0.5rem' }}>Create shared workspaces</li>
              <li style={{ marginBottom: '0.5rem' }}>Collaborate on projects in real-time</li>
              <li>Control permissions (Admin, Editor, Viewer)</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '2rem',
          }}>
            <p style={{ color: '#fbbf24', fontSize: '0.8125rem', margin: 0 }}>
              🔒 <strong>Guest Mode Limitation:</strong> Your data is stored locally in this browser only. 
              Team features require an account so members can be identified and data can be synced.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/auth/signup')}
              style={{
                padding: '0.875rem 2rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9375rem',
              }}
            >
              ✨ Create Free Account
            </button>
            <button
              onClick={() => router.push('/auth/signin')}
              style={{
                padding: '0.875rem 1.5rem',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '10px',
                color: '#c4b5fd',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '0.9375rem',
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Load data from localStorage
  useEffect(() => {
    const loadData = () => {
      // Load members
      const savedMembers = localStorage.getItem(STORAGE_KEYS.members);
      if (savedMembers) {
        setMembers(JSON.parse(savedMembers));
      } else {
        // Initialize with current user as owner
        const initialMembers: TeamMember[] = [{
          id: 'owner-1',
          name: 'You',
          email: 'you@example.com',
          role: 'owner',
          status: 'active',
          lastActive: new Date().toISOString(),
          joinedAt: new Date().toISOString(),
        }];
        setMembers(initialMembers);
        localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(initialMembers));
      }

      // Load workspaces
      const savedWorkspaces = localStorage.getItem(STORAGE_KEYS.workspaces);
      if (savedWorkspaces) {
        setWorkspaces(JSON.parse(savedWorkspaces));
      } else {
        // Initialize with default workspace
        const initialWorkspaces: Workspace[] = [{
          id: 'ws-default',
          name: 'My Workspace',
          description: 'Default workspace',
          members: ['owner-1'],
          projects: [],
          isDefault: true,
          createdAt: new Date().toISOString(),
        }];
        setWorkspaces(initialWorkspaces);
        localStorage.setItem(STORAGE_KEYS.workspaces, JSON.stringify(initialWorkspaces));
      }

      // Load activity
      const savedActivity = localStorage.getItem(STORAGE_KEYS.activity);
      if (savedActivity) {
        setActivity(JSON.parse(savedActivity));
      }
    };

    loadData();
  }, []);

  // Save functions
  const saveMembers = (newMembers: TeamMember[]) => {
    setMembers(newMembers);
    localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(newMembers));
  };

  const saveWorkspaces = (newWorkspaces: Workspace[]) => {
    setWorkspaces(newWorkspaces);
    localStorage.setItem(STORAGE_KEYS.workspaces, JSON.stringify(newWorkspaces));
  };

  const logActivity = (userName: string, action: string, target: string, targetType: ActivityItem['targetType']) => {
    const newActivity: ActivityItem = {
      id: `activity-${Date.now()}`,
      userId: 'owner-1',
      userName,
      action,
      target,
      targetType,
      timestamp: new Date().toISOString(),
    };
    const updatedActivity = [newActivity, ...activity].slice(0, 50); // Keep last 50
    setActivity(updatedActivity);
    localStorage.setItem(STORAGE_KEYS.activity, JSON.stringify(updatedActivity));
  };

  // CRUD operations for members
  const addMember = (name: string, email: string, role: TeamMember['role']) => {
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name,
      email,
      role,
      status: 'pending',
      joinedAt: new Date().toISOString(),
    };
    const updatedMembers = [...members, newMember];
    saveMembers(updatedMembers);
    logActivity('You', 'invited', email, 'member');
  };

  const updateMemberRole = (memberId: string, newRole: TeamMember['role']) => {
    const member = members.find(m => m.id === memberId);
    if (!member || member.role === 'owner') return; // Can't change owner role
    
    const updatedMembers = members.map(m => 
      m.id === memberId ? { ...m, role: newRole } : m
    );
    saveMembers(updatedMembers);
    logActivity('You', `changed role to ${newRole} for`, member.name, 'member');
  };

  const removeMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member || member.role === 'owner') return; // Can't remove owner
    
    const updatedMembers = members.filter(m => m.id !== memberId);
    saveMembers(updatedMembers);
    
    // Also remove from workspaces
    const updatedWorkspaces = workspaces.map(ws => ({
      ...ws,
      members: ws.members.filter(id => id !== memberId),
    }));
    saveWorkspaces(updatedWorkspaces);
    
    logActivity('You', 'removed', member.name, 'member');
  };

  const activateMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    
    const updatedMembers = members.map(m => 
      m.id === memberId ? { ...m, status: 'active' as const, lastActive: new Date().toISOString() } : m
    );
    saveMembers(updatedMembers);
    logActivity(member.name, 'joined the team', '', 'member');
  };

  // CRUD operations for workspaces
  const addWorkspace = (name: string, description: string) => {
    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name,
      description,
      members: ['owner-1'],
      projects: [],
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    const updatedWorkspaces = [...workspaces, newWorkspace];
    saveWorkspaces(updatedWorkspaces);
    logActivity('You', 'created workspace', name, 'workspace');
  };

  const updateWorkspace = (workspaceId: string, name: string, description: string) => {
    const updatedWorkspaces = workspaces.map(ws => 
      ws.id === workspaceId ? { ...ws, name, description } : ws
    );
    saveWorkspaces(updatedWorkspaces);
    logActivity('You', 'updated workspace', name, 'workspace');
  };

  const deleteWorkspace = (workspaceId: string) => {
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (!workspace || workspace.isDefault) return; // Can't delete default workspace
    
    const updatedWorkspaces = workspaces.filter(ws => ws.id !== workspaceId);
    saveWorkspaces(updatedWorkspaces);
    logActivity('You', 'deleted workspace', workspace.name, 'workspace');
  };

  const setDefaultWorkspace = (workspaceId: string) => {
    const updatedWorkspaces = workspaces.map(ws => ({
      ...ws,
      isDefault: ws.id === workspaceId,
    }));
    saveWorkspaces(updatedWorkspaces);
  };

  const roleColors: Record<string, string> = {
    owner: '#f59e0b',
    admin: '#8b5cf6',
    editor: '#3b82f6',
    viewer: '#64748b',
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'members', label: 'Members', icon: '👥', count: members.length },
    { id: 'workspaces', label: 'Workspaces', icon: '🏢', count: workspaces.length },
    { id: 'activity', label: 'Activity', icon: '📜' },
  ];

  // Count shared projects from localStorage
  const [sharedProjects, setSharedProjects] = useState(0);
  useEffect(() => {
    const projects = localStorage.getItem('moonscribe-projects');
    if (projects) {
      setSharedProjects(JSON.parse(projects).length);
    }
  }, []);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>👥 Team</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Manage your team members and workspaces</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            padding: '0.625rem 1.25rem',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          ➕ Invite Members
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
        paddingBottom: '0.75rem',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '0.625rem 1rem',
              background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeTab === tab.id ? '#c4b5fd' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.3)' : 'rgba(100, 116, 139, 0.2)',
                padding: '0.125rem 0.5rem',
                borderRadius: '10px',
                fontSize: '0.75rem',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginBottom: '1.5rem',
            gridColumn: '1 / -1',
          }}>
            {[
              { label: 'Team Members', value: members.length, icon: '👥', color: '#8b5cf6' },
              { label: 'Workspaces', value: workspaces.length, icon: '🏢', color: '#6366f1' },
              { label: 'Shared Projects', value: sharedProjects, icon: '📁', color: '#3b82f6' },
            ].map((stat, idx) => (
              <div key={idx} style={{
                padding: '1.25rem',
                background: 'rgba(15, 15, 35, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${stat.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}>
                  {stat.icon}
                </div>
                <div>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{stat.value}</p>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Members */}
          <div style={{
            padding: '1.5rem',
            background: 'rgba(15, 15, 35, 0.6)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '16px',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Team Members</h3>
            {members.length > 0 ? members.slice(0, 5).map(member => (
              <div key={member.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 0',
                borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${roleColors[member.role]} 0%, #8b5cf6 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#f1f5f9', fontSize: '0.9375rem' }}>{member.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{member.email}</div>
                </div>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  background: `${roleColors[member.role]}20`,
                  color: roleColors[member.role],
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  textTransform: 'capitalize',
                }}>
                  {member.role}
                </span>
              </div>
            )) : (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No team members yet</p>
            )}
          </div>

          {/* Recent Activity */}
          <div style={{
            padding: '1.5rem',
            background: 'rgba(15, 15, 35, 0.6)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '16px',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Activity</h3>
            {activity.length > 0 ? activity.slice(0, 5).map(item => (
              <div key={item.id} style={{
                padding: '0.75rem 0',
                borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
              }}>
                <p style={{ color: '#f1f5f9', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <strong>{item.userName}</strong> {item.action} {item.target && <span style={{ color: '#8b5cf6' }}>{item.target}</span>}
                </p>
                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>
                  {formatRelativeTime(new Date(item.timestamp))}
                </p>
              </div>
            )) : (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No activity yet</p>
            )}
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div style={{
          background: 'rgba(15, 15, 35, 0.6)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>Member</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>Role</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>Joined</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id} style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.08)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${roleColors[member.role]} 0%, #8b5cf6 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                      }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: '#f1f5f9', fontSize: '0.9375rem' }}>{member.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {member.role === 'owner' ? (
                      <span style={{
                        padding: '0.375rem 0.75rem',
                        background: `${roleColors[member.role]}20`,
                        color: roleColors[member.role],
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        textTransform: 'capitalize',
                      }}>
                        {member.role}
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.id, e.target.value as TeamMember['role'])}
                        style={{
                          padding: '0.375rem 0.75rem',
                          background: `${roleColors[member.role]}20`,
                          border: '1px solid transparent',
                          borderRadius: '6px',
                          color: roleColors[member.role],
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.375rem 0.75rem',
                      background: member.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: member.status === 'active' ? '#34d399' : '#fbbf24',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      textTransform: 'capitalize',
                      cursor: member.status === 'pending' ? 'pointer' : 'default',
                    }}
                    onClick={() => member.status === 'pending' && activateMember(member.id)}
                    title={member.status === 'pending' ? 'Click to activate' : ''}
                    >
                      {member.status}
                      {member.status === 'pending' && ' (click to activate)'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    {formatRelativeTime(new Date(member.joinedAt))}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    {member.role !== 'owner' && (
                      <button 
                        onClick={() => removeMember(member.id)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '6px',
                          color: '#f87171',
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Workspaces Tab */}
      {activeTab === 'workspaces' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
          {workspaces.map(workspace => (
            <div key={workspace.id} style={{
              padding: '1.5rem',
              background: 'rgba(15, 15, 35, 0.6)',
              border: workspace.isDefault ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(139, 92, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}>
                  🏢
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 600, margin: 0 }}>{workspace.name}</h3>
                    {workspace.isDefault && (
                      <span style={{
                        background: 'rgba(139, 92, 246, 0.2)',
                        color: '#c4b5fd',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.6875rem',
                      }}>
                        Default
                      </span>
                    )}
                  </div>
                  {workspace.description && (
                    <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0 }}>{workspace.description}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  <span>👥</span> {workspace.members.length} members
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  <span>📁</span> {workspace.projects.length} projects
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setEditingWorkspace(workspace)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '6px',
                    color: '#c4b5fd',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                {!workspace.isDefault && (
                  <>
                    <button 
                      onClick={() => setDefaultWorkspace(workspace.id)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '6px',
                        color: '#34d399',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                      }}
                    >
                      Set Default
                    </button>
                    <button 
                      onClick={() => deleteWorkspace(workspace.id)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        color: '#f87171',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          
          {/* Add Workspace Card */}
          <div 
            onClick={() => setShowWorkspaceModal(true)}
            style={{
              padding: '1.5rem',
              background: 'rgba(139, 92, 246, 0.05)',
              border: '2px dashed rgba(139, 92, 246, 0.3)',
              borderRadius: '16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '150px',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#8b5cf6' }}>+</div>
            <p style={{ color: '#c4b5fd', fontWeight: 500 }}>Create Workspace</p>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div style={{
          padding: '1.5rem',
          background: 'rgba(15, 15, 35, 0.6)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          borderRadius: '16px',
        }}>
          {activity.length > 0 ? activity.map((item, idx) => (
            <div key={item.id} style={{
              display: 'flex',
              gap: '1rem',
              padding: '1rem 0',
              borderBottom: idx < activity.length - 1 ? '1px solid rgba(139, 92, 246, 0.1)' : 'none',
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.875rem',
                flexShrink: 0,
              }}>
                {item.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ color: '#f1f5f9', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                  <strong>{item.userName}</strong> {item.action} {item.target && <span style={{ color: '#8b5cf6' }}>{item.target}</span>}
                </p>
                <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0 }}>
                  {formatRelativeTime(new Date(item.timestamp))}
                </p>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📜</div>
              <p>No activity yet</p>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal 
          onClose={() => setShowInviteModal(false)} 
          onInvite={addMember}
        />
      )}

      {/* Workspace Modal */}
      {(showWorkspaceModal || editingWorkspace) && (
        <WorkspaceModal 
          workspace={editingWorkspace}
          onClose={() => { setShowWorkspaceModal(false); setEditingWorkspace(null); }} 
          onSave={(name, description) => {
            if (editingWorkspace) {
              updateWorkspace(editingWorkspace.id, name, description);
            } else {
              addWorkspace(name, description);
            }
            setShowWorkspaceModal(false);
            setEditingWorkspace(null);
          }}
        />
      )}
    </div>
  );
}

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (name: string, email: string, role: TeamMember['role']) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('editor');

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    onInvite(name, email, role);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
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
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamMember['role'])}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            >
              <option value="admin">Admin - Full access</option>
              <option value="editor">Editor - Can edit</option>
              <option value="viewer">Viewer - View only</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!name.trim() || !email.trim()}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: (!name.trim() || !email.trim()) ? 'rgba(139, 92, 246, 0.3)' : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 500,
                cursor: (!name.trim() || !email.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              Add Member
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceModal({ workspace, onClose, onSave }: { 
  workspace: Workspace | null; 
  onClose: () => void; 
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName] = useState(workspace?.name || '');
  const [description, setDescription] = useState(workspace?.description || '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(name, description);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
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
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
            {workspace ? 'Edit Workspace' : 'Create Workspace'}
          </h2>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Engineering Team"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this workspace for?"
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!name.trim()}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: !name.trim() ? 'rgba(139, 92, 246, 0.3)' : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 500,
                cursor: !name.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {workspace ? 'Save Changes' : 'Create Workspace'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}
