import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Appointment, AppointmentPayload } from '../models/appointment.model';
import { query, supabase } from '../supabase';

const WITH_RELATIONS = '*, client:clients(*), salon_service:salon_services(*)';

@Injectable({
  providedIn: 'root',
})
export class AppointmentsService {
  /** Appointments starting between the two dates (YYYY-MM-DD), both days included. */
  getAll(start?: string, end?: string): Observable<Appointment[]> {
    let request = supabase.from('appointments').select(WITH_RELATIONS);

    if (start) {
      request = request.gte('start_time', start);
    }

    if (end) {
      request = request.lte('start_time', `${end} 23:59:59`);
    }

    return query(request.order('start_time'));
  }

  create(payload: AppointmentPayload): Observable<Appointment> {
    return query<Appointment>(supabase.from('appointments').insert(payload).select(WITH_RELATIONS).single()).pipe(
      tap((appointment) => this.notifyClient(appointment, 'created'))
    );
  }

  update(id: number, payload: AppointmentPayload): Observable<Appointment> {
    return query<Appointment>(
      supabase.from('appointments').update(payload).eq('id', id).select(WITH_RELATIONS).single()
    ).pipe(tap((appointment) => this.notifyClient(appointment, 'updated')));
  }

  delete(id: number): Observable<null> {
    return query(supabase.from('appointments').delete().eq('id', id));
  }

  /** Texts the client about the change. A failed message never fails saving the appointment. */
  private notifyClient(appointment: Appointment, change: 'created' | 'updated'): void {
    supabase.functions
      .invoke('notify-appointment', { body: { appointment_id: appointment.id, change } })
      .then(({ error }) => {
        if (error) {
          console.error('Could not notify the client about their appointment.', error);
        }
      });
  }
}
