import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SalonService } from '../models/salon-service.model';
import { query, supabase } from '../supabase';

@Injectable({
  providedIn: 'root'
})
export class SalonServiceService {
  getAll(): Observable<SalonService[]> {
    return query(supabase.from('salon_services').select().order('name'));
  }

  // The slug is set by the database from the name.
  create(payload: { name: string }): Observable<SalonService> {
    return query(supabase.from('salon_services').insert(payload).select().single());
  }

  update(id: number, payload: { name: string }): Observable<SalonService> {
    return query(supabase.from('salon_services').update(payload).eq('id', id).select().single());
  }

  delete(id: number): Observable<null> {
    return query(supabase.from('salon_services').delete().eq('id', id));
  }
}
