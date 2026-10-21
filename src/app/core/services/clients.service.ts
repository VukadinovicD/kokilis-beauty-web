import {Injectable} from '@angular/core';
import {catchError, from, map, Observable, throwError} from 'rxjs';
import {Client, PaginatedClientsResponse} from '../models/client.model';
import {query, supabase, toError} from '../supabase';

const PER_PAGE = 5;

@Injectable({
  providedIn: 'root',
})
export class ClientsService {
  getClients(search = '', page = 1): Observable<PaginatedClientsResponse> {
    let request = supabase.from('clients').select('*', { count: 'exact' });

    // Every word must match some column, so "Ana Petrović" finds first + last name.
    for (const term of search.trim().split(/\s+/).filter(Boolean)) {
      // These would break the filter syntax or act as wildcards.
      const like = `%${term.replace(/[%_,()"\\]/g, '')}%`;
      const digits = term.replace(/\D/g, '');

      const columns = [
        `first_name.ilike.${like}`,
        `last_name.ilike.${like}`,
        `nickname.ilike.${like}`,
        `phone_number.ilike.${like}`,
        // Match phone numbers regardless of spaces, dashes or slashes.
        ...(digits ? [`phone_digits.ilike.%${digits}%`] : []),
      ];

      request = request.or(columns.join(','));
    }

    return from(request.order('id', { ascending: false }).range((page - 1) * PER_PAGE, page * PER_PAGE - 1)).pipe(
      map(({ data, count, error }) => {
        if (error) {
          throw toError(error);
        }

        return {
          current_page: page,
          data: data as Client[],
          last_page: Math.max(1, Math.ceil((count ?? 0) / PER_PAGE)),
          total: count ?? 0,
        };
      }),
      // The page no longer exists, e.g. after deleting the only client on the last page.
      catchError((error) =>
        error.code === 'PGRST103' && page > 1 ? this.getClients(search, page - 1) : throwError(() => error)
      )
    );
  }

  getClient(id: number): Observable<Client> {
    return query(supabase.from('clients').select().eq('id', id).single());
  }

  createClient(payload: Omit<Client, 'id'>): Observable<Client> {
    return query(supabase.from('clients').insert(payload).select().single());
  }

  updateClient(id: number, payload: Omit<Client, 'id'>): Observable<Client> {
    return query(supabase.from('clients').update(payload).eq('id', id).select().single());
  }

  deleteClient(id: number): Observable<null> {
    return query(supabase.from('clients').delete().eq('id', id));
  }
}
