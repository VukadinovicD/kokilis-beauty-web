import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SalonService } from '../models/salon-service.model';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SalonServiceService {
  private apiUrl = `${environment.apiUrl}/salon-services`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<SalonService[]> {
    return this.http.get<SalonService[]>(this.apiUrl);
  }

  create(payload: { name: string }): Observable<{ message: string; data: SalonService }> {
    return this.http.post<{ message: string; data: SalonService }>(this.apiUrl, payload);
  }

  update(id: number, payload: { name: string }): Observable<{ message: string; data: SalonService }> {
    return this.http.put<{ message: string; data: SalonService }>(`${this.apiUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
