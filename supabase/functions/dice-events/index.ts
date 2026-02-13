const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DICE_GRAPHQL_URL = 'https://partners-endpoint.dice.fm/graphql';

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

    const { action } = await req.json();

    if (action === 'fetch_events') {
      // Fetch events list
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

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'fetch_event_tickets') {
      const body = await req.json().catch(() => ({}));
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
