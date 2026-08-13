'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { SelectedPlace } from '@/features/locations/types';
import { createEventAction } from '@/app/actions/createEvent';

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
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
      const file = e.target.files[0];
      setPosterFile(file);
      const url = URL.createObjectURL(file);
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

  const handlePublish = async () => {
    if (isSubmitting) return;
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
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('startAt', startAt);
    formData.append('endAt', endAt);
    if (selectedPlace?.placeId) formData.append('placeId', selectedPlace.placeId);
    formData.append('placeName', selectedPlace!.placeName);
    if (selectedPlace?.address) formData.append('address', selectedPlace.address);
    if (selectedPlace?.latitude) formData.append('latitude', selectedPlace.latitude.toString());
    if (selectedPlace?.longitude) formData.append('longitude', selectedPlace.longitude.toString());
    if (description) formData.append('description', description);
    formData.append('approvalRequired', approvalRequired.toString());
    if (recruitingCount) formData.append('recruitingCount', recruitingCount.toString());
    if (posterFile) formData.append('poster', posterFile);

    try {
      const result = await createEventAction(formData);
      if (result.success && result.eventId) {
        if (result.warning) {
          // Poster failed, but event created successfully. 
          // We could show a toast, but navigating immediately is fine.
          console.warn(result.warning);
        }
        router.push(`/events/${result.eventId}`);
      } else {
        setErrors({ submit: result.error || 'エラーが発生しました' });
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setErrors({ submit: '予期せぬエラーが発生しました' });
      setIsSubmitting(false);
    }
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
            disabled={isSubmitting}
            style={{
              width: '37px', height: '37px', borderRadius: '50%',
              background: '#fff', border: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1
            }}
          >
            {isSubmitting ? (
              <div style={{ width: '16px', height: '16px', border: '2px solid #ccc', borderTopColor: '#666', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            )}
          </button>
        }
      />
      <PageContainer bottomInset="none">
        <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {errors.submit && (
            <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '14px' }}>
              {errors.submit}
            </div>
          )}

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
