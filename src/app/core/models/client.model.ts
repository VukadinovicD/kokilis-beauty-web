export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string | null;
  phone_number: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedClientsResponse {
  current_page: number;
  data: Client[];
  last_page: number;
  total: number;
}
