# Supabase + GitHub Pages

Aplikacija nema svoj server. Angular je na GitHub Pages, a baza, login i slanje SMS-a su na Supabase-u (besplatan plan).

| Šta | Gde |
|---|---|
| Tabele i pravila pristupa | `migrations/20261019000000_init.sql` |
| Admin nalog | `seed-admin.sql` |
| SMS preko BulkGate-a | `functions/notify-appointment/index.ts` |
| Deploy sajta | `../.github/workflows/deploy.yml` |

Podatke vidi i menja samo korisnik sa `app_metadata.role = "admin"`. Tu ulogu može da dodeli samo neko sa pristupom Supabase dashboard-u, ne može je dodeliti sam sebi.

## Podešavanje (jednom)

### 1. Supabase projekat

1. Napravi nalog na https://supabase.com i novi projekat (region: **Central EU (Frankfurt)**). Lozinku baze sačuvaj negde, aplikaciji ne treba.
2. **SQL Editor** → New query → nalepi ceo `migrations/20261019000000_init.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email**: isključi **Allow new users to sign up**.
4. **Authentication → Users → Add user → Create new user**: email `kokiliiis10avgust@gmail.com`, nova lozinka, uključi **Auto Confirm User**.
5. **SQL Editor** → nalepi `seed-admin.sql` → **Run**. Ovo tom nalogu daje admin ulogu.

### 2. Ključevi u aplikaciji

**Project Settings → API Keys** (i **Data API** za URL): kopiraj **Project URL** i **publishable** ključ (ili `anon` ako piše legacy) u `src/environments/environment.ts`.

Ova dva podatka su javna, smeju u git. **Nikad** ne stavljaj `service_role` / `secret` ključ u frontend.

### 3. SMS funkcija

1. **Edge Functions → Deploy a new function → Via Editor**, ime **`notify-appointment`**, nalepi sadržaj `functions/notify-appointment/index.ts` → **Deploy**.
2. **Edge Functions → Secrets**, dodaj:

| Ime | Vrednost |
|---|---|
| `MESSAGING_DRIVER` | `log` dok testiraš (poruka samo ide u log funkcije), `bulkgate` za prave SMS-ove |
| `MESSAGING_SIGNATURE` | `Kokilis Beauty` |
| `MESSAGING_COUNTRY_CODE` | `381` |
| `BULKGATE_APPLICATION_ID` | iz BulkGate portala |
| `BULKGATE_APPLICATION_TOKEN` | iz BulkGate portala |
| `BULKGATE_SENDER_TYPE` | `gText` (registrovano ime) ili `gSystem` (BulkGate broj, bez registracije) |
| `BULKGATE_SENDER_VALUE` | `KokilisBty` (max 11 znakova) |

Šta je funkcija uradila vidi se u **Edge Functions → notify-appointment → Logs**.

### 4. GitHub Pages

1. Repo na GitHub-u mora biti **public** (Pages je besplatan samo za javne repoe; u kodu nema tajni).
2. **Settings → Pages → Source: GitHub Actions**.
3. Svaki push na `master` automatski builduje i objavljuje sajt na https://vukadinovicd.github.io/kokilis-beauty-web/
4. U Supabase-u: **Authentication → URL Configuration → Site URL** stavi tu adresu.

## Lokalni razvoj

```
npm install
npm start
```

Lokalno radi nad istim Supabase projektom.

## Promena šeme

Napravi novi fajl u `migrations/` (npr. `20261101000000_add_notes_to_clients.sql`) i pokreni ga u SQL Editor-u. Stare fajlove ne menjaj.

## Dobro je znati

- Besplatan Supabase projekat se **pauzira posle 7 dana bez ikakvog korišćenja**. Ako salon koristi aplikaciju svakodnevno, to se ne dešava. Ako se pauzira, vraća se jednim klikom u dashboard-u, a podaci ostaju.
