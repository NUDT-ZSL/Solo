import ProfileArea from '@/components/ProfileArea'
import HabitBoard from '@/components/HabitBoard'

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <ProfileArea />
      <HabitBoard />
    </div>
  )
}
