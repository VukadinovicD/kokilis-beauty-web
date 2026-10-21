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
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}
