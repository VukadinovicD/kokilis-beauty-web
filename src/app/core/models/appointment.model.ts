import { Client } from './client.model';
import { SalonService } from './salon-service.model';

export interface Appointment {
  id: number;
  start_time: string;
  client_id: number;
  salon_service_id: number;
  client?: Client;
  salon_service?: SalonService;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentPayload {
  start_time: string;
  client_id: number;
  salon_service_id: number;
}