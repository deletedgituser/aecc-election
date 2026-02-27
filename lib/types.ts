export interface Candidate {
  id: number
  name: string
  voteCount: number
  createdAt: Date
  updatedAt: Date
}

export interface WebSocketMessage {
  type: 'update' | 'add' | 'delete'
  data: Candidate | Candidate[]
}
