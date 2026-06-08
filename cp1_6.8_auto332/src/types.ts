export interface VoiceMessage {
  id: string
  anonymous_id: string
  audio_url: string
  blur_title: string
  duration: number
  created_at: string
}

export interface EchoConnection {
  id: string
  voice_id: string
  sender_id: string
  responder_id: string
  created_at: string
  expires_at: string
  response_text: string
  response_audio_url: string | null
  blur_title: string
  remaining_seconds?: number
  is_expired?: boolean
}
