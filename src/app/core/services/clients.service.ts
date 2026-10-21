import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {Observable} from 'rxjs';
import {Client, PaginatedClientsResponse} from '../models/client.model';

@Injectable({
  providedIn: 'root',
})
export class ClientsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/clients`;

  getClients(search = '', page = 1): Observable<PaginatedClientsResponse> {
    let params = new HttpParams().set('page', page);

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<PaginatedClientsResponse>(this.apiUrl, { params });
  }

  getClient(id: number): Observable<{ data: Client }> {
    return this.http.get<{ data: Client }>(`${this.apiUrl}/${id}`);
  }

  createClient(payload: Omit<Client, 'id'>): Observable<{ message: string; data: Client }> {
    return this.http.post<{ message: string; data: Client }>(this.apiUrl, payload);
  }

  updateClient(id: number, payload: Omit<Client, 'id'>): Observable<{ message: string; data: Client }> {
    return this.http.put<{ message: string; data: Client }>(`${this.apiUrl}/${id}`, payload);
  }

  deleteClient(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
