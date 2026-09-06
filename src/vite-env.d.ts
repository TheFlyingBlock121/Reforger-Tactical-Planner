/// <reference types="vite/client" />

import type { PlanFile, TileMapManifest } from "./types";

declare global {
  type OverlayState = {
    alwaysOnTop: boolean;
    opacity: number;
    clickThrough: boolean;
    sideMode: boolean;
  };

  type DesktopApi = {
    minimize(): void;
    maximize(): void;
    close(): void;
  copyText(value: string): Promise<boolean>;
    getOverlayState(): Promise<OverlayState>;
    setAlwaysOnTop(value: boolean): Promise<OverlayState>;
    setOpacity(value: number): Promise<OverlayState>;
    setClickThrough(value: boolean): Promise<OverlayState>;
    setSideMode(value: boolean): Promise<OverlayState>;
    onOverlayState(callback: (state: OverlayState) => void): () => void;
    listTileMaps(): Promise<TileMapManifest[]>;
    openBuiltInTilesFolder(): Promise<string>;
    openMapsFolder(): Promise<string>;
    openMapImage(): Promise<{ name: string; dataUrl: string } | null>;
    savePlan(payload: PlanFile): Promise<string | null>;
    loadPlan(): Promise<unknown | null>;
  };

  interface Window {
    desktop?: DesktopApi;
  }
}

export {};
