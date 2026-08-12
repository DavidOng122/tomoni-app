import React from 'react';

interface EventParticipationSettingsProps {
  approvalRequired: boolean;
  recruitingCount: number | null;
  onChangeApproval: (val: boolean) => void;
  onChangeRecruitingCount: (val: number | null) => void;
}

export const EventParticipationSettings: React.FC<EventParticipationSettingsProps> = ({
  approvalRequired,
  recruitingCount,
  onChangeApproval,
  onChangeRecruitingCount
}) => {
  return (
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
          
          <div 
            onClick={() => onChangeApproval(!approvalRequired)}
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
          
          <select 
            value={recruitingCount || ''} 
            onChange={(e) => onChangeRecruitingCount(Number(e.target.value))}
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
  );
};
