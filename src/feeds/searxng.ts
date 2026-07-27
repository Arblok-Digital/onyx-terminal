"use strict";

import { rateLimiter } from "@/core/rate-limiter";
import { fetchJson } from "@/core/api";

// Konfigurasi SearXNG Gateway 9Router
const GATEWAY_ENDPOINT = "http://localhost:20128/v1/search";
const API_KEY = process.env.NINEROUTER_API_KEY || "sk-53057********************"; // Sesuaikan dengan key Anda

/**
 * Melakukan pencarian menggunakan SearXNG via Gateway 9Router.
 */
export async function searchSearXNG(
  query: string,
  maxResults: number = 5
): Promise<any> {
  const payload = {
    model: "searxng",
    query: query,
    search_type: "web",
    max_results: maxResults
  };

  const response = await fetch(GATEWAY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Gagal memanggil 9Router Gateway: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results || [];
}