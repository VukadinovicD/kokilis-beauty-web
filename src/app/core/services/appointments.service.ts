import { Injectable } from '@angular/core';
import { from, Observable, switchMap, tap } from 'rxjs';
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
      tap((appointment) => this.notifyClient(appointment.id, 'created'))
    );
  }

  update(id: number, payload: AppointmentPayload): Observable<Appointment> {
    return query<Appointment>(
      supabase.from('appointments').update(payload).eq('id', id).select(WITH_RELATIONS).single()
    ).pipe(tap((appointment) => this.notifyClient(appointment.id, 'updated')));
  }

  // The client is texted first: once deleted, the message has nothing left to read.
  delete(id: number): Observable<null> {
    return from(this.notifyClient(id, 'deleted')).pipe(
      switchMap(() => query<null>(supabase.from('appointments').delete().eq('id', id)))
    );
  }

  /** Texts the client about the change. A failed message never fails saving the appointment. */
  private notifyClient(appointmentId: number, change: 'created' | 'updated' | 'deleted'): Promise<void> {
    return supabase.functions
      .invoke('notify-appointment', { body: { appointment_id: appointmentId, change } })
      .then(({ error }) => {
        if (error) {
          console.error('Could not notify the client about their appointment.', error);
        }
      });
  }
}
