import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DICE_GRAPHQL_URL = 'https://partners-endpoint.dice.fm/graphql';

function getTodayISO(): string {
  // Use Italian timezone so "today" resets at midnight Rome time
  const now = new Date();
  const rome = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' }); // returns YYYY-MM-DD
  return rome;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('DICE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'DICE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'fetch_events') {
      const query = `{
        viewer {
          events(first: 50) {
            totalCount
            edges {
              node {
                id
                name
                state
                startDatetime
                endDatetime
                totalTicketAllocationQty
                ticketTypes {
                  id
                  name
                  price
                  totalTicketAllocationQty
                }
                tickets(first: 0) {
                  totalCount
                }
              }
            }
          }
        }
      }`;

      const response = await fetch(DICE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('DICE API error:', data);
        return new Response(
          JSON.stringify({ success: false, error: `DICE API error: ${response.status}`, details: data }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Save daily baseline snapshot (only the FIRST fetch of the day is kept)
      let todayBaseline: any[] | null = null;
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const sb = createClient(supabaseUrl, supabaseKey);
        const today = getTodayISO();

        const edges = data?.data?.viewer?.events?.edges || [];
        const activeEdges = edges.filter((edge: any) => edge.node.state !== 'CANCELLED');
        const rows = activeEdges.map((edge: any) => ({
          event_id: edge.node.id,
          event_name: edge.node.name,
          ticket_type: 'total',
          tickets_sold: edge.node.tickets?.totalCount || 0,
          snapshot_date: today,
        }));

        if (rows.length > 0) {
          // INSERT only if no snapshot exists for today (preserves first-of-day baseline)
          await sb
            .from('ticket_snapshots')
            .upsert(rows, { onConflict: 'event_id,snapshot_date', ignoreDuplicates: true })
            .throwOnError();
        }

        // Always return today's baseline
        const { data: baselineData } = await sb
          .from('ticket_snapshots')
          .select('event_id, event_name, tickets_sold')
          .eq('snapshot_date', today);
        todayBaseline = baselineData;

        // Also get yesterday's baseline for % comparison
        const { data: prevDates } = await sb
          .from('ticket_snapshots')
          .select('snapshot_date')
          .lt('snapshot_date', today)
          .order('snapshot_date', { ascending: false })
          .limit(1);

        let yesterdayBaseline = null;
        let yesterdayDate = null;
        if (prevDates && prevDates.length > 0) {
          yesterdayDate = prevDates[0].snapshot_date;
          const { data: ydData } = await sb
            .from('ticket_snapshots')
            .select('event_id, event_name, tickets_sold')
            .eq('snapshot_date', yesterdayDate);
          yesterdayBaseline = ydData;
        }

        return new Response(
          JSON.stringify({
            success: true,
            data,
            todayBaseline,
            yesterdayBaseline,
            yesterdayDate,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (snapErr) {
        console.error('Snapshot error (non-blocking):', snapErr);
        return new Response(
          JSON.stringify({ success: true, data, todayBaseline: null, yesterdayBaseline: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }




    if (action === 'fetch_event_tickets') {
      const eventId = body.eventId;

      const query = `{
        node(id: "${eventId}") {
          ... on Event {
            id
            name
            ticketTypes {
              id
              name
              price
              totalTicketAllocationQty
            }
            tickets(first: 0) {
              totalCount
            }
          }
        }
      }`;

      const response = await fetch(DICE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
