import React from 'react';
import { X } from 'lucide-react';
import type { FamilyMember } from '../types';

interface MemberCardProps {
  member: FamilyMember;
  onDelete: (id: string) => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, onDelete }) => {
  return (
    <div
      className="relative fade-in p-4 rounded-xl flex flex-col gap-3"
      style={{ width: 200, height: 140, backgroundColor: '#2a2a3e' }}
    >
      <button
        onClick={() => onDelete(member.id)}
        className="absolute top-2 right-2 text-gray-400 hover:text-red-400 transition-colors"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-3">
        <div
          className="rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ width: 50, height: 50, backgroundColor: member.avatarColor }}
        >
          {member.name.charAt(0)}
        </div>
        <div>
          <div className="font-semibold text-white">{member.name}</div>
          <div className="text-sm text-gray-400">{member.age}岁</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 overflow-hidden">
        {member.preferences.slice(0, 3).map((pref, idx) => (
          <span
            key={idx}
            className="text-xs px-2 py-0.5 rounded-md text-gray-200"
            style={{ backgroundColor: '#3e4a6e' }}
          >
            {pref}
          </span>
        ))}
        {member.preferences.length > 3 && (
          <span
            className="text-xs px-2 py-0.5 rounded-md text-gray-200"
            style={{ backgroundColor: '#3e4a6e' }}
          >
            +{member.preferences.length - 3}
          </span>
        )}
        {member.allergens.map((allergen, idx) => (
          <span
            key={`a-${idx}`}
            className="text-xs px-2 py-0.5 rounded-md text-red-200"
            style={{ backgroundColor: '#5c2a2a' }}
          >
            {allergen}过敏
          </span>
        ))}
      </div>
    </div>
  );
};

export default MemberCard;
