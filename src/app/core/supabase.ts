import { createClient, PostgrestError } from '@supabase/supabase-js';
import { from, map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

const ERROR_MESSAGES: Record<string, string> = {
  '23505': 'Zapis sa tim nazivom već postoji.',
  '23514': 'Neispravni podaci.',
};

/**
 * Turns a Supabase query into an Observable that emits its data, or errors with
 * a message that can be shown as is.
 */
export function query<T>(request: PromiseLike<{ data: unknown; error: PostgrestError | null }>): Observable<T> {
  return from(request).pipe(
    map(({ data, error }) => {
      if (error) {
        throw toError(error);
      }

      return data as T;
    })
  );
}

export function toError(error: PostgrestError): Error {
  return Object.assign(new Error(ERROR_MESSAGES[error.code] ?? error.message), { code: error.code });
}
