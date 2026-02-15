const { createSupabaseClient } = require("../src/config/supabase");

const parseBody = (event) => {
  if (!event || !event.body) {
    return {};
  }

  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch (error) {
    console.error("Failed to parse event body", error);
    return {};
  }
};

const handler = async (event) => {
  const payload = parseBody(event);
  const recordingUrl = payload.recording_url || payload.recordingUrl || null;
  const callId = payload.call_id || payload.callId || null;
  const userId = payload.user_id || payload.userId || null;
  const metadata = payload.metadata || {};

  if (!recordingUrl || !callId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "recording_url and call_id are required." }),
    };
  }

  try {
    const supabase = createSupabaseClient(true);

    await supabase.from("call_recordings").insert({
      call_id: callId,
      user_id: userId,
      recording_url: recordingUrl,
      metadata,
      status: "pending",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "queued" }),
    };
  } catch (error) {
    console.error("Lambda process-call error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to store recording." }),
    };
  }
};

module.exports = { handler };
