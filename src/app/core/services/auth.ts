import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { LoginResponse, User } from '../models/auth.model';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  private apiUrl = environment.apiUrl;
  private userSubject = new BehaviorSubject<User | null>(this.getStoredUser());

  user$ = this.userSubject.asObservable();

  login(payload: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((response) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.userSubject.next(response.user);
      })
    );
  }

  getMe(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.apiUrl}/me`).pipe(
      tap((response) => {
        localStorage.setItem('user', JSON.stringify(response.user));
        this.userSubject.next(response.user);
      })
    );
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => this.clearSession())
    );
  }

  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getStoredUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}
