'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { PageContainer } from '@/components/layout/PageContainer';

export const CreateEventView: React.FC = () => {
  const router = useRouter();
  
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [startDateTime, setStartDateTime] = useState('2026年8月10日 19:00');
  const [endDateTime, setEndDateTime] = useState('21:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [recruitingCount, setRecruitingCount] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setPosterPreview(url);
    }
  };

  return (
    <>
      <MobileHeader 
        title="イベントを作成"
        leftElement={
          <button 
            onClick={() => router.back()}
            style={{
              width: '37px', height: '37px', borderRadius: '50%',
              background: '#fff', border: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        }
        rightElement={
          <button 
            onClick={() => router.push('/discover')}
            style={{
              width: '37px', height: '37px', borderRadius: '50%',
              background: '#fff', border: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        }
      />
      <PageContainer bottomInset="none">
        <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Poster Upload Area */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div 
              style={{
                position: 'relative',
                width: '199px',
                height: '192px',
                borderRadius: '18px',
                background: '#D9D9D9',
                overflow: 'hidden'
              }}
            >
              {posterPreview ? (
                <img src={posterPreview} alt="Poster preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Gray placeholder */}
                </div>
              )}
              
              <button 
                onClick={handleImageClick}
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '29px',
                  background: '#fff',
                  border: '1px solid #E0E0E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </button>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} style={{ display: 'none' }} />
            </div>
          </div>

          {/* Event Name */}
          <div>
            <input 
              type="text" 
              placeholder="イベント名" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 19px',
                borderRadius: '14px',
                border: 'none',
                background: '#fff',
                fontSize: '18px',
                fontWeight: 590,
                outline: 'none',
                color: 'black',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            />
          </div>

          {/* Date / Time Card */}
          <div style={{
            background: '#fff',
            borderRadius: '17px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#959595' }}></div>
                <span style={{ fontSize: '15px', fontWeight: 510, color: 'black' }}>開始</span>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 510, color: 'black' }}>{startDateTime}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid #959595' }}></div>
                <span style={{ fontSize: '15px', fontWeight: 510, color: 'black' }}>終了</span>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 510, color: 'black' }}>{endDateTime}</span>
            </div>
          </div>

          {/* Location */}
          <div 
            style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '16px 19px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              cursor: 'pointer'
            }}
            onClick={() => {/* Keep interactive but do not persist mock location */}}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#959595" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style={{ fontSize: '15px', fontWeight: 510, color: '#959595' }}>
              場所を選択
            </span>
          </div>

          {/* Description */}
          <div>
            <textarea 
              placeholder="説明を追加"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 19px',
                borderRadius: '14px',
                border: 'none',
                background: '#fff',
                fontSize: '15px',
                fontWeight: 510,
                outline: 'none',
                minHeight: '80px',
                resize: 'vertical',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            />
          </div>

          {/* Participation Settings */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 510, color: '#666', marginBottom: '8px', marginLeft: '8px' }}>
              参加設定
            </div>
            <div style={{
              background: '#fff',
              borderRadius: '17px',
              padding: '14px 15px 14px 21px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span style={{ fontSize: '15px', fontWeight: 510 }}>承認制</span>
                </div>
                
                {/* Custom Toggle matching approved design */}
                <div 
                  onClick={() => setApprovalRequired(!approvalRequired)}
                  style={{
                    width: '48px',
                    height: '28px',
                    borderRadius: '100px',
                    background: approvalRequired ? '#484C49' : '#E5E7EB',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: '2px',
                    left: approvalRequired ? '22px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span style={{ fontSize: '15px', fontWeight: 510 }}>あと何人募集しますか？</span>
                </div>
                
                {/* Local number control */}
                <select 
                  value={recruitingCount || ''} 
                  onChange={(e) => setRecruitingCount(Number(e.target.value))}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '15px',
                    fontWeight: 510,
                    outline: 'none',
                    textAlign: 'right',
                    cursor: 'pointer',
                    color: recruitingCount ? 'black' : '#959595'
                  }}
                >
                  <option value="" disabled>選択</option>
                  {[...Array(20)].map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1}人</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
        </div>
      </PageContainer>
    </>
  );
};
