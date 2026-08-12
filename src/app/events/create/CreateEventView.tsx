'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { SelectedPlace } from '@/features/locations/types';

import { PosterUploadField } from './components/PosterUploadField';
import { EventTitleField } from './components/EventTitleField';
import { EventDateTimeCard } from './components/EventDateTimeCard';
import { EventLocationField } from './components/EventLocationField';
import { EventDescriptionField } from './components/EventDescriptionField';
import { EventParticipationSettings } from './components/EventParticipationSettings';

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

  useEffect(() => {
    const initialStart = getNearestHour();
    const initialEnd = new Date(initialStart.getTime() + 2 * 60 * 60 * 1000);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartAt(formatDatetimeLocal(initialStart));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEndAt(formatDatetimeLocal(initialEnd));
  }, []);

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
          
          <PosterUploadField 
            posterPreview={posterPreview} 
            onImageChange={handleImageChange} 
          />

          <EventTitleField 
            title={title} 
            onChange={setTitle} 
            error={errors.title} 
          />

          <EventDateTimeCard 
            startAt={startAt} 
            endAt={endAt} 
            onChangeStart={setStartAt} 
            onChangeEnd={setEndAt} 
            error={errors.startAt || errors.endAt} 
          />

          <EventLocationField 
            selectedPlace={selectedPlace} 
            onChange={setSelectedPlace} 
            error={errors.location} 
          />

          <EventDescriptionField 
            description={description} 
            onChange={setDescription} 
          />

          <EventParticipationSettings 
            approvalRequired={approvalRequired} 
            recruitingCount={recruitingCount} 
            onChangeApproval={setApprovalRequired} 
            onChangeRecruitingCount={setRecruitingCount} 
          />
          
        </div>
      </PageContainer>
    </>
  );
};
