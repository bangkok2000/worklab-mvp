'use client';

import React, { useState } from 'react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending';
  lastActive?: Date;
  joinedAt: Date;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  projectCount: number;
  isDefault: boolean;
  createdAt: Date;
}

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: Date;
}

// Demo data
const demoMembers: TeamMember[] = [
  { id: '1', name: 'You', email: 'you@example.com', role: 'owner', status: 'active', lastActive: new Date(), joinedAt: new Date(Date.now() - 30 * 86400000) },
  { id: '2', name: 'Alice Chen', email: 'alice@example.com', role: 'admin', status: 'active', lastActive: new Date(Date.now() - 3600000), joinedAt: new Date(Date.now() - 20 * 86400000) },
  { id: '3', name: 'Bob Smith', email: 'bob@example.com', role: 'editor', status: 'active', lastActive: new Date(Date.now() - 86400000), joinedAt: new Date(Date.now() - 15 * 86400000) },
  { id: '4', name: 'Charlie Kim', email: 'charlie@example.com', role: 'viewer', status: 'pending', joinedAt: new Date() },
];

const demoWorkspaces: Workspace[] = [
  { id: '1', name: 'Engineering Team', description: 'Technical documentation and research', memberCount: 4, projectCount: 8, isDefault: true, createdAt: new Date(Date.now() - 30 * 86400000) },
  { id: '2', name: 'Marketing', description: 'Campaign materials and analysis', memberCount: 2, projectCount: 3, isDefault: false, createdAt: new Date(Date.now() - 15 * 86400000) },
];

const demoActivity: ActivityItem[] = [
  { id: '1', user: 'Alice Chen', action: 'added a new document', target: 'AI Research Project', timestamp: new Date(Date.now() - 1800000) },
  { id: '2', user: 'Bob Smith', action: 'saved an insight', target: 'RAG Best Practices', timestamp: new Date(Date.now() - 7200000) },
  { id: '3', user: 'You', action: 'created a new project', target: 'Q1 Planning', timestamp: new Date(Date.now() - 14400000) },
  { id: '4', user: 'Alice Chen', action: 'invited', target: 'charlie@example.com', timestamp: new Date(Date.now() - 28800000) },
];

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'workspaces' | 'activity'>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const roleColors: Record<string, string> = {
    owner: '#f59e0b',
    admin: '#8b5cf6',
    editor: '#3b82f6',
    viewer: '#64748b',
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'members', label: 'Members', icon: '👥', count: demoMembers.length },
    { id: 'workspaces', label: 'Workspaces', icon: '🏢', count: demoWorkspaces.length },
    { id: 'activity', label: 'Activity', icon: '📜' },
  ];

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
              { label: 'Team Members', value: demoMembers.length, icon: '👥', color: '#8b5cf6' },
              { label: 'Workspaces', value: demoWorkspaces.length, icon: '🏢', color: '#6366f1' },
              { label: 'Shared Projects', value: 11, icon: '📁', color: '#3b82f6' },
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
            {demoMembers.slice(0, 4).map(member => (
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
                  {member.name.charAt(0)}
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
            ))}
          </div>

          {/* Recent Activity */}
          <div style={{
            padding: '1.5rem',
            background: 'rgba(15, 15, 35, 0.6)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '16px',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Activity</h3>
            {demoActivity.slice(0, 4).map(activity => (
              <div key={activity.id} style={{
                padding: '0.75rem 0',
                borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
              }}>
                <p style={{ color: '#f1f5f9', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <strong>{activity.user}</strong> {activity.action} <span style={{ color: '#8b5cf6' }}>{activity.target}</span>
                </p>
                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>
                  {formatRelativeTime(activity.timestamp)}
                </p>
              </div>
            ))}
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
                <th style={{ padding: '1rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>Last Active</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {demoMembers.map(member => (
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
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ color: '#f1f5f9', fontSize: '0.9375rem' }}>{member.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
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
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.375rem 0.75rem',
                      background: member.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: member.status === 'active' ? '#34d399' : '#fbbf24',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      textTransform: 'capitalize',
                    }}>
                      {member.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    {member.lastActive ? formatRelativeTime(member.lastActive) : 'Never'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button style={{
                      padding: '0.375rem 0.75rem',
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      borderRadius: '6px',
                      color: '#c4b5fd',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}>
                      ⋯
                    </button>
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
          {demoWorkspaces.map(workspace => (
            <div key={workspace.id} style={{
              padding: '1.5rem',
              background: 'rgba(15, 15, 35, 0.6)',
              border: workspace.isDefault ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '16px',
              cursor: 'pointer',
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
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  <span>👥</span> {workspace.memberCount} members
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  <span>📁</span> {workspace.projectCount} projects
                </div>
              </div>
            </div>
          ))}
          
          {/* Add Workspace Card */}
          <div style={{
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
          }}>
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
          {demoActivity.map((activity, idx) => (
            <div key={activity.id} style={{
              display: 'flex',
              gap: '1rem',
              padding: '1rem 0',
              borderBottom: idx < demoActivity.length - 1 ? '1px solid rgba(139, 92, 246, 0.1)' : 'none',
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
                {activity.user.charAt(0)}
              </div>
              <div>
                <p style={{ color: '#f1f5f9', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                  <strong>{activity.user}</strong> {activity.action} <span style={{ color: '#8b5cf6' }}>{activity.target}</span>
                </p>
                <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0 }}>
                  {formatRelativeTime(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');

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
              onChange={(e) => setRole(e.target.value)}
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
            <button style={{
              flex: 1,
              padding: '0.75rem',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              Send Invite
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
