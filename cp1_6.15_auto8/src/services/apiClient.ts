export type DisputeType = 'service_incomplete' | 'health_issue' | 'fee_dispute'
export type DisputeStatus = 'pending' | 'mediating' | 'resolved'
export type MessageRole = 'owner' | 'sitter' | 'customer_service'

export interface EvidenceImage {
  id: string
  url: string
  thumbnail: string
  description: string
}

export interface OrderNode {
  type: 'checkin' | 'checkout' | 'fee_change' | 'health_check'
  label: string
  time: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  type: 'text' | 'image'
  timestamp: string
  orderNode?: OrderNode
}

export interface MediationSuggestion {
  id: string
  content: string
  adopted: boolean
}

export interface Dispute {
  id: string
  petName: string
  petAvatar: string
  sitterName: string
  ownerName: string
  fosterStartDate: string
  fosterEndDate: string
  disputeType: DisputeType
  disputeStatus: DisputeStatus
  description: string
  evidenceImages: EvidenceImage[]
  chatMessages: ChatMessage[]
  suggestions: MediationSuggestion[]
  handlingRecords: string[]
  createdAt: string
}

export interface PagedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiResponse<T> {
  data: T
  error?: string
}

const BASE_URL = '/api'

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API Request failed:', error)
      throw error
    }
  }

  async getDisputes(params: {
    page?: number
    pageSize?: number
    type?: string
    startDate?: string
    endDate?: string
  } = {}): Promise<PagedResponse<Dispute>> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', String(params.page))
    if (params.pageSize) searchParams.append('pageSize', String(params.pageSize))
    if (params.type) searchParams.append('type', params.type)
    if (params.startDate) searchParams.append('startDate', params.startDate)
    if (params.endDate) searchParams.append('endDate', params.endDate)

    const queryString = searchParams.toString()
    return this.request<PagedResponse<Dispute>>(
      `/disputes${queryString ? `?${queryString}` : ''}`
    )
  }

  async getDisputeById(id: string): Promise<ApiResponse<Dispute>> {
    return this.request<ApiResponse<Dispute>>(`/disputes/${id}`)
  }

  async updateDisputeStatus(
    id: string,
    status: DisputeStatus
  ): Promise<ApiResponse<Dispute>> {
    return this.request<ApiResponse<Dispute>>(`/disputes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  }

  async generateSuggestions(id: string): Promise<ApiResponse<MediationSuggestion[]>> {
    return this.request<ApiResponse<MediationSuggestion[]>>(
      `/disputes/${id}/suggestions`,
      {
        method: 'POST',
      }
    )
  }

  async adoptSuggestion(
    disputeId: string,
    suggestionId: string
  ): Promise<ApiResponse<MediationSuggestion>> {
    return this.request<ApiResponse<MediationSuggestion>>(
      `/disputes/${disputeId}/suggestions/${suggestionId}/adopt`,
      {
        method: 'POST',
      }
    )
  }
}

export const apiClient = new ApiClient()
