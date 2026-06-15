import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { FlavorProfile } from '@/types'

interface FlavorCardProps {
  profile: FlavorProfile
}

export default function FlavorCard({ profile }: FlavorCardProps) {
  return (
    <Link to={`/detail/${profile.id}`}>
      <div className="group rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl shadow-md border border-white/30 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 ease-out">
        <div className="relative">
          <img
            src={profile.imageUrl}
            alt={profile.foodName}
            className="w-full aspect-[4/3] object-cover"
          />
          <div className="absolute top-3 right-3 bg-white/70 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center text-2xl">
            {profile.mood}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-lg text-[#6B4C3B]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {profile.foodName}
          </h3>
          <p className="text-sm text-[#8B7355] line-clamp-2 mt-1">
            {profile.description}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {profile.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#F5E6D3] text-[#6B4C3B] text-xs px-2.5 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <img
                src={profile.author.avatar}
                alt={profile.author.name}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-xs text-[#8B7355]">{profile.author.name}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#8B7355]">
              <Heart className="w-3.5 h-3.5" />
              <span>{profile.likes}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
