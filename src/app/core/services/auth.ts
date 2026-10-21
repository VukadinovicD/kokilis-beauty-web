import { Injectable } from '@angular/core';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { BehaviorSubject, from, map, Observable, tap } from 'rxjs';
import { User } from '../models/auth.model';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);

  user$ = this.userSubject.asObservable();

  constructor() {
    // Supabase keeps the session in localStorage and refreshes it on its own.
    supabase.auth.onAuthStateChange((_event, session) => {
      this.userSubject.next(session ? toUser(session.user) : null);
    });
  }

  login(payload: { email: string; password: string }): Observable<User> {
    return from(supabase.auth.signInWithPassword(payload)).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.code === 'invalid_credentials' ? 'Pogrešan email ili lozinka.' : error.message);
        }

        return toUser(data.user);
      }),
      tap((user) => this.userSubject.next(user))
    );
  }

  getMe(): Observable<User | null> {
    return from(supabase.auth.getUser()).pipe(map(({ data }) => (data.user ? toUser(data.user) : null)));
  }

  logout(): Observable<void> {
    return from(supabase.auth.signOut()).pipe(map(() => undefined));
  }

  async isLoggedIn(): Promise<boolean> {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  }
}

function toUser(user: SupabaseUser): User {
  return {
    id: user.id,
    first_name: user.user_metadata['first_name'] ?? '',
    last_name: user.user_metadata['last_name'] ?? '',
    email: user.email ?? '',
    role: user.app_metadata['role'] ?? null,
  };
}
