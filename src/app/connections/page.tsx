'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { useRouter } from 'next/navigation';

const sentInvitations = [
  { id: 1, name: 'Miki', category: '朝の散歩', date: '8月17日（月）８:00ごろ', status: '返事待ち', avatar: 'https://i.pravatar.cc/150?u=miki' },
  { id: 2, name: 'Julia', category: '朝の散歩', date: '8月17日（月）８:00ごろ', status: '返事待ち', avatar: 'https://i.pravatar.cc/150?u=julia' }
];

const conversations = [
  { id: 1, name: 'Karen Castillo', time: '9:40', message: '当日、よろしくお願いします！', unread: 2, avatar: 'https://i.pravatar.cc/150?u=karen' },
  { id: 2, name: 'John Smith', time: '10:15', message: '会議の準備を進めています。', unread: 3, avatar: 'https://i.pravatar.cc/150?u=john' },
  { id: 3, name: 'Emily Chen', time: '11:00', message: '資料を更新しました。', unread: 1, avatar: 'https://i.pravatar.cc/150?u=emily' },
  { id: 4, name: 'Michael Brown', time: '12:30', message: '今後の打ち合わせについて確認します。', unread: 4, avatar: 'https://i.pravatar.cc/150?u=michael' },
];

export default function ConnectionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'あいさつ' | '同行予定'>('あいさつ');

  const navItems = [
    {
      label: 'みつける',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>,
      isActive: false,
      onClick: () => router.push('/discover')
    },
    {
      label: 'つながり',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
      isActive: true,
      activeColor: '#FF8861',
      activeIconBgColor: '#E8E8E8',
      onClick: () => { }
    },
    {
      label: 'マイページ',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
      isActive: false,
      onClick: () => { }
    },
  ];

  return (
    <>
      <PageContainer bottomInset="nav">
        <div style={{ padding: '24px 0 0' }}>
          {/* Header */}
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 24px 0', padding: '0 8px' }}>
            つながり
          </h1>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '32px', padding: '0 16px', position: 'relative' }}>
            <button
              onClick={() => setActiveTab('あいさつ')}
              style={{
                background: 'none',
                border: 'none',
                padding: '0 0 12px 0',
                fontSize: '17px',
                fontWeight: activeTab === 'あいさつ' ? 600 : 400,
                color: activeTab === 'あいさつ' ? '#000' : '#666',
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              あいさつ
              {activeTab === 'あいさつ' && (
                <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: '2px', background: '#000', borderRadius: '2px' }} />
              )}
            </button>
            <button
              onClick={() => setActiveTab('同行予定')}
              style={{
                background: 'none',
                border: 'none',
                padding: '0 0 12px 0',
                fontSize: '17px',
                fontWeight: activeTab === '同行予定' ? 600 : 400,
                color: activeTab === '同行予定' ? '#000' : '#666',
                position: 'relative',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              同行予定
              <div style={{ width: '8px', height: '8px', background: '#FF8861', borderRadius: '50%', marginLeft: '6px', marginTop: '-12px' }} />
              {activeTab === '同行予定' && (
                <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: '2px', background: '#000', borderRadius: '2px' }} />
              )}
            </button>
          </div>
          <div style={{ height: '1px', background: 'var(--color-divider)', margin: '0 -16px 24px -16px' }} />

          {activeTab === 'あいさつ' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

              {/* Sent Invitations Section */}
              <section style={{ padding: '0 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#007aff' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                  </div>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: 600, margin: 0, color: '#333' }}>送ったお誘い</h2>
                    <p style={{ fontSize: '12px', color: '#666', margin: '2px 0 0 0' }}>あなたから送った同行のお誘い</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', margin: '0 -16px', padding: '0 16px 8px 16px' }}>
                  {sentInvitations.map(invite => (
                    <div key={invite.id} style={{
                      flex: '0 0 160px',
                      background: '#fff',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #E0E0E0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', marginBottom: '8px' }}>
                        <img src={invite.avatar} alt={invite.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>{invite.name}</div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '11px', color: '#666' }}>{invite.category}</span>
                        <span style={{ fontSize: '11px', color: '#666' }}>{invite.date}</span>
                      </div>

                      <div style={{ background: '#F2F2F2', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 500, color: '#666' }}>
                        {invite.status}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Conversations List Section */}
              <section>
                <h2 style={{ fontSize: '17px', fontWeight: 600, margin: '0 8px 16px 8px', color: '#333' }}>あいさつ</h2>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {conversations.map((conv, index) => (
                    <div key={conv.id} className="hoverable" style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 8px',
                      cursor: 'pointer',
                      borderBottom: index < conversations.length - 1 ? '1px solid #F0F0F0' : 'none'
                    }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, marginRight: '16px' }}>
                        <img src={conv.avatar} alt={conv.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.name}</span>
                          <span style={{ fontSize: '12px', color: '#888', flexShrink: 0, marginLeft: '8px' }}>{conv.time}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px' }}>{conv.message}</span>
                          {conv.unread > 0 && (
                            <div style={{
                              background: '#FF7622',
                              color: '#F6F7FC',
                              fontSize: '11px',
                              fontWeight: 600,
                              minWidth: '20px',
                              height: '20px',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0 6px',
                              flexShrink: 0
                            }}>
                              {conv.unread}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === '同行予定' && null}
        </div>
      </PageContainer>
      <BottomNavigation items={navItems} />
    </>
  );
}
