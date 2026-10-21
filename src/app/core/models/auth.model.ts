export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string | null;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}
