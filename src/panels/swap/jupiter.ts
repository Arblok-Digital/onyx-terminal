/**
 * @file jupiter.ts
 * @layer panel
 * @desc Singleton loader + thin TS shim around the Jupiter Plugin script.
 *       Injects <script src=plugin.jup.ag/plugin-v1.js> exactly once and
 *       resolves when window.Jupiter is ready.
 * @exposes loadJupiter, type JupiterInitProps, type JupiterApi
 * @deps panels/swap/swap.config
 */
import { JUP_SCRIPT_URL } from "./swap.config";

export type JupiterInitProps = {
  displayMode?: "integrated" | "modal" | "widget";
  integratedTargetId?: string;
  endpoint?: string;
  formProps?: {
    initialInputMint?: string;
    initialOutputMint?: string;
    fixedInputMint?: boolean;
    fixedOutputMint?: boolean;
    swapMode?: "ExactIn" | "ExactOut";
  };
  /** Referral account pubkey (base58). */
  referralAccount?: string;
  /** Platform fee in basis points (e.g. 50 = 0.50%). */
  platformFeeBps?: number;
  containerStyles?: Record<string, string | number>;
  containerClassName?: string;
};

export type JupiterApi = {
  init: (props: JupiterInitProps) => void;
  resume?: () => void;
  close?: () => void;
};

declare global {
  interface Window {
    Jupiter?: JupiterApi;
  }
}

let loadPromise: Promise<JupiterApi> | null = null;

/**
 * Load the Jupiter Plugin script once. Subsequent callers get the same
 * promise. Resolves with `window.Jupiter`.
 */
export function loadJupiter(): Promise<JupiterApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Jupiter requires a browser"));
  }
  if (window.Jupiter) return Promise.resolve(window.Jupiter);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<JupiterApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${JUP_SCRIPT_URL}"]`,
    );
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = JUP_SCRIPT_URL;
      script.async = true;
      document.head.appendChild(script);
    }

    const onReady = () => {
      if (window.Jupiter) resolve(window.Jupiter);
      else reject(new Error("Jupiter loaded but window.Jupiter is undefined"));
    };
    const onError = () => {
      loadPromise = null;
      reject(new Error("Failed to load Jupiter Plugin"));
    };

    if (existing && window.Jupiter) {
      onReady();
      return;
    }

    script.addEventListener("load", onReady, { once: true });
    script.addEventListener("error", onError, { once: true });
  });

  return loadPromise;
}
