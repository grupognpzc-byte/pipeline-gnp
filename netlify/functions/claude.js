// netlify/functions/claude.js
// Proxy seguro para la API de Anthropic — Pipeline GNP 2026

exports.handler = async function (event, context) {
  // ── CORS headers ──────────────────────────────────────────────
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Preflight OPTIONS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  // Solo POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  // ── Validar API key ───────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY no está configurada en Netlify");
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "API key no configurada en el servidor" }),
    };
  }

  // ── Parsear body ──────────────────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Body inválido: no es JSON válido" }),
    };
  }

  const { model, max_tokens, system, messages } = payload;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Falta el campo 'messages'" }),
    };
  }

  // ── Llamada a Anthropic ───────────────────────────────────────
  try {
    const requestBody = {
      model: model || "claude-sonnet-4-6",
      max_tokens: max_tokens || 4096,
      messages,
    };

    // system prompt es opcional
    if (system) requestBody.system = system;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de Anthropic:", response.status, JSON.stringify(data));
      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({
          error: data.error?.message || "Error en la API de Anthropic",
          type: data.error?.type || "api_error",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("Error interno en la función:", err.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Error interno del servidor",
        detail: err.message,
      }),
    };
  }
};
