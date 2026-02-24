import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getEditionKey(eventName: string, eventDate: string): string | null {
  const m = eventName.match(/Color Fest\s*(\d+)/i);
  if (m) return `CF${m[1]}`;

  if (/winter|pasquetta|factory/i.test(eventName)) {
    const date = new Date(eventDate);
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    const editionYear = month >= 8 ? year + 1 : year;
    const editionNum = editionYear - 2012;
    if (editionNum >= 10 && editionNum <= 14) return `CF${editionNum}`;
    return null;
  }

  if (/color fest/i.test(eventName)) {
    const date = new Date(eventDate);
    const year = date.getUTCFullYear();
    if (year === 2022) return 'CF10';
    if (year === 2023) return 'CF11';
    return null;
  }

  return null;
}

function getPresenzeMultiplier(eventName: string): number {
  if (/winter/i.test(eventName)) return /abbonamento/i.test(eventName) ? 2 : 1;
  if (/pasquetta/i.test(eventName)) return 1;
  if (/2\s*days?/i.test(eventName)) return 2;
  if (/(abbonamento|full)/i.test(eventName) && !/1\s*day|one\s*day/i.test(eventName)) return 3;
  return 1;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const csvText = body.csvText;
    if (!csvText) {
      return new Response(
        JSON.stringify({ success: false, error: 'No CSV data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lines = csvText.split('\n');
    const aggregated = new Map<string, { presenze: number; tickets: number }>();
    let processed = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCSVLine(line);
      if (cols[4] !== 'Charge') { skipped++; continue; }

      const transactionDate = cols[5] || '';
      const quantity = parseInt(cols[8] || '0') || 0;
      const eventDate = cols[27] || '';
      const eventName = cols[28] || '';

      if (!transactionDate || !eventName) { skipped++; continue; }

      const editionKey = getEditionKey(eventName, eventDate);
      if (!editionKey) { skipped++; continue; }

      const multiplier = getPresenzeMultiplier(eventName);
      const saleDate = transactionDate.split(' ')[0];
      const presenze = quantity * multiplier;

      const key = `${editionKey}::${saleDate}`;
      const existing = aggregated.get(key) || { presenze: 0, tickets: 0 };
      existing.presenze += presenze;
      existing.tickets += quantity;
      aggregated.set(key, existing);
      processed++;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Clear existing data
    await sb.from('historical_daily_presenze').delete().neq('edition_key', '');

    const rows = Array.from(aggregated.entries()).map(([key, val]) => {
      const [edition_key, sale_date] = key.split('::');
      return { edition_key, sale_date, presenze_delta: val.presenze, tickets_delta: val.tickets };
    });

    // Insert in batches of 500
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await sb.from('historical_daily_presenze').upsert(batch, {
        onConflict: 'edition_key,sale_date',
      });
      if (error) throw new Error(`Batch insert error: ${error.message}`);
    }

    const editions = [...new Set(rows.map(r => r.edition_key))].sort();

    return new Response(
      JSON.stringify({ success: true, processed, skipped, uniqueDays: aggregated.size, editions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
