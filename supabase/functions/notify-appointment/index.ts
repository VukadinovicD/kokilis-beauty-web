// Lets a client know by SMS that their appointment was booked or moved.
//
// The web app calls this after saving an appointment. BulkGate credentials stay
// here as function secrets, never in the browser.
//
// Secrets (Edge Functions -> Secrets):
//   MESSAGING_DRIVER            log = only write to the function log, bulkgate = send SMS
//   MESSAGING_SIGNATURE         signs every message, default "Kokilis Beauty"
//   MESSAGING_COUNTRY_CODE      prefix for locally written numbers (060... -> 38160...), default 381
//   BULKGATE_APPLICATION_ID
//   BULKGATE_APPLICATION_TOKEN
//   BULKGATE_SENDER_TYPE        gText = name in BULKGATE_SENDER_VALUE (registered in the BulkGate portal),
//                               gSystem = BulkGate's shared number, no registration needed
//   BULKGATE_SENDER_VALUE       max 11 characters

import { createClient } from 'npm:@supabase/supabase-js@2';

// @see https://help.bulkgate.com/docs/en/http-simple-transactional.html
const BULKGATE_URL = 'https://portal.bulkgate.com/api/1.0/simple/transactional';

// Serbian letters outside the GSM alphabet; with them an SMS switches to
// Unicode, which fits 70 instead of 160 characters and costs double or more.
const TRANSLITERATION: Record<string, string> = {
  'č': 'c', 'ć': 'c', 'š': 's', 'ž': 'z', 'đ': 'dj',
  'Č': 'C', 'Ć': 'C', 'Š': 'S', 'Ž': 'Z', 'Đ': 'Dj',
};

const CHANGES: Record<string, string> = {
  created: 'zakazan je',
  updated: 'pomeren je',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Client {
  id: number;
  first_name: string;
  phone_number: string;
}

const env = (name: string, fallback = '') => Deno.env.get(name) ?? fallback;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { appointment_id, change } = await req.json().catch(() => ({}));

  if (!Number.isInteger(appointment_id) || !(change in CHANGES)) {
    return json({ message: 'Expected appointment_id and change (created or updated).' }, 422);
  }

  // Query as the caller, so Row Level Security decides whether they may see this appointment.
  const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  const { data: appointment } = await supabase
    .from('appointments')
    .select('start_time, client:clients(id, first_name, phone_number), salon_service:salon_services(name)')
    .eq('id', appointment_id)
    .maybeSingle();

  if (!appointment) {
    return json({ message: 'Appointment not found.' }, 404);
  }

  const text = message(appointment, CHANGES[change]);

  try {
    await send(appointment.client as unknown as Client, text);
  } catch (e) {
    console.error('Could not notify the client about their appointment.', {
      appointment_id,
      exception: e instanceof Error ? e.message : String(e),
    });

    return json({ message: 'Could not send the message.' }, 502);
  }

  return json({ message: 'Message sent.' });
});

function message(appointment: { start_time: string; client: unknown; salon_service: unknown }, change: string): string {
  const client = appointment.client as Client;
  const service = appointment.salon_service as { name: string };
  // start_time is wall-clock time without a zone, e.g. 2026-10-19T10:30:00.
  const [, y, m, d, h, i] = appointment.start_time.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)!;

  return `Zdravo ${client.first_name}, Vas termin za ${service.name} ${change} ${d}.${m}.${y}. u ${h}:${i}. ` +
    `Vidimo se! - ${env('MESSAGING_SIGNATURE', 'Kokilis Beauty')}`;
}

async function send(client: Client, text: string): Promise<void> {
  if (env('MESSAGING_DRIVER', 'log') !== 'bulkgate') {
    console.log('Message (log driver).', { client_id: client.id, phone_number: client.phone_number, text });
    return;
  }

  const body = Object.fromEntries(Object.entries({
    application_id: env('BULKGATE_APPLICATION_ID'),
    application_token: env('BULKGATE_APPLICATION_TOKEN'),
    number: internationalNumber(client, env('MESSAGING_COUNTRY_CODE', '381')),
    text: text.replace(/[čćšžđČĆŠŽĐ]/g, (letter) => TRANSLITERATION[letter]),
    sender_id: env('BULKGATE_SENDER_TYPE', 'gText'),
    sender_id_value: env('BULKGATE_SENDER_VALUE'),
  }).filter(([, value]) => value !== ''));

  const response = await fetch(BULKGATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  const result = await response.json().catch(() => null);
  const status = result?.data?.status;

  if (!response.ok || !['accepted', 'scheduled'].includes(status)) {
    throw new Error(`BulkGate refused the message (${status ?? response.status}): ${result?.error ?? JSON.stringify(result)}`);
  }
}

// International number without the leading plus, while clients are usually
// stored the way they are dialled locally (060...).
function internationalNumber(client: Client, countryCode: string): string {
  const digits = client.phone_number.replace(/\D/g, '');

  if (digits === '') {
    throw new Error(`Client ${client.id} has no usable phone number.`);
  }

  if (digits.startsWith('00')) {
    return digits.slice(2);
  }

  if (digits.startsWith('0')) {
    return countryCode + digits.slice(1);
  }

  return digits;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
