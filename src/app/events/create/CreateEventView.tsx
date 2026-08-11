'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { LocationAutocomplete } from '@/features/locations/components/LocationAutocomplete';
import { SelectedPlace } from '@/features/locations/types';

const getNearestHour = () => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return now;
};

const formatDatetimeLocal = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const CreateEventView: React.FC = () => {
  const router = useRouter();
  
  // 1. Initial State Setup
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);

  const [description, setDescription] = useState('');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [recruitingCount, setRecruitingCount] = useState<number | null>(null);
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initialStart = getNearestHour();
    const initialEnd = new Date(initialStart.getTime() + 2 * 60 * 60 * 1000);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartAt(formatDatetimeLocal(initialStart));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEndAt(formatDatetimeLocal(initialEnd));
  }, []);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setPosterPreview(url);
    }
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push('/discover');
    }
  };

  const handlePublish = () => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) newErrors.title = 'イベント名を入力してください';
    if (!startAt) newErrors.startAt = '開始時間を設定してください';
    if (!endAt) newErrors.endAt = '終了時間を設定してください';
    if (startAt && endAt && endAt <= startAt) {
      newErrors.endAt = '終了時間は開始時間より後に設定してください';
    }
    if (!selectedPlace || !selectedPlace.placeName) {
      newErrors.location = '場所を選択してください';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    
    // Validation passed, STOP here for UI-only phase.
    console.log("Validation passed. Form State:", {
      posterPreview,
      title,
      startAt,
      endAt,
      placeId: selectedPlace?.placeId || null,
      placeName: selectedPlace?.placeName || '',
      address: selectedPlace?.address || null,
      latitude: selectedPlace?.latitude || null,
      longitude: selectedPlace?.longitude || null,
      description,
      approvalRequired,
      recruitingCount
    });
  };

  return (
    <>
      <MobileHeader 
        title="イベントを作成"
        leftElement={
          <button 
            onClick={handleBack}
            style={{
              width: '37px', height: '37px', borderRadius: '50%',
              background: '#fff', border: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {/* Downward chevron icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        }
        rightElement={
          <button 
            onClick={handlePublish}
            style={{
              width: '37px', height: '37px', borderRadius: '50%',
              background: '#fff', border: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {/* Checkmark icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
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
                border: errors.title ? '1px solid red' : 'none',
                background: '#fff',
                fontSize: '18px',
                fontWeight: 590,
                outline: 'none',
                color: 'black',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            />
            {errors.title && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px', paddingLeft: '8px' }}>{errors.title}</div>}
          </div>

          {/* Date / Time Card */}
          <div style={{
            background: '#fff',
            borderRadius: '17px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: (errors.startAt || errors.endAt) ? '1px solid red' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#959595' }}></div>
                <span style={{ fontSize: '15px', fontWeight: 510, color: 'black' }}>開始</span>
              </div>
              <input 
                type="datetime-local" 
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                style={{ fontSize: '15px', fontWeight: 510, color: 'black', border: 'none', background: 'transparent', outline: 'none' }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid #959595' }}></div>
                <span style={{ fontSize: '15px', fontWeight: 510, color: 'black' }}>終了</span>
              </div>
              <input 
                type="datetime-local" 
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                style={{ fontSize: '15px', fontWeight: 510, color: 'black', border: 'none', background: 'transparent', outline: 'none' }}
              />
            </div>
            {(errors.startAt || errors.endAt) && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                {errors.startAt || errors.endAt}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <div 
              style={{
                background: '#fff',
                borderRadius: '14px',
                padding: '4px 19px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: errors.location ? '1px solid red' : 'none'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#959595" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <LocationAutocomplete 
                value={selectedPlace} 
                onChange={(place) => setSelectedPlace(place)} 
                placeholder="場所を選択"
                className="location-input"
              />
              <style>{`
                .location-input {
                  width: 100%;
                  padding: 12px 0;
                  border: none;
                  background: transparent;
                  font-size: 15px;
                  font-weight: 510;
                  outline: none;
                  color: ${selectedPlace ? 'black' : '#959595'};
                }
              `}</style>
            </div>
            {errors.location && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px', paddingLeft: '8px' }}>{errors.location}</div>}
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
