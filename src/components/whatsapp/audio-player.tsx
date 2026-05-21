"use client";

// WhatsApp-style voice note / audio bubble. Renders a round play/pause
// button, a clickable progress track, and a duration readout. Uses a
// hidden HTMLAudioElement under the hood so we still benefit from
// native streaming + codec handling.
//
// Lazy: nothing is fetched until the user hits play. WhatsApp does the
// same — its progress bar shows total time only after first play.

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  // Controls the bubble tint (outgoing/green vs incoming/white). Affects
  // the track color and the play button background so the player feels
  // native to the bubble it's embedded in.
  outgoing?: boolean;
}

function formatSeconds(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, outgoing = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);

  // Attach native listeners once. We re-create the Audio element on src
  // change (effect deps) so the cleanup runs naturally.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.src = src;
    audioRef.current = audio;

    const onTime = () => setCurrent(audio.currentTime);
    const onLoaded = () => {
      // Some browsers (Chrome esp. for opus) only fill duration after
      // the first decode; we keep listening to durationchange too.
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrent(audio.duration ?? 0);
    };
    const onError = () => {
      setHasError(true);
      setIsPlaying(false);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => setHasError(true));
    else a.pause();
  };

  // Click anywhere on the track to seek. We translate the click X (in
  // the track's local coordinate system) to a fraction of duration and
  // set currentTime accordingly. If duration isn't known yet, ignore.
  const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Account for RTL — the visual "start" of the track is the side
    // matching the document direction. We just use clientX vs left edge
    // since the audio progresses in the same direction as the time axis
    // regardless of doc direction.
    const x = e.clientX - rect.left;
    const frac = Math.max(0, Math.min(1, x / rect.width));
    a.currentTime = frac * duration;
    setCurrent(a.currentTime);
  };

  const pct = duration ? (current / duration) * 100 : 0;
  const trackBg = outgoing ? "bg-emerald-200/70" : "bg-gray-200";
  const trackFill = outgoing ? "bg-emerald-600" : "bg-emerald-500";
  const btnBg = outgoing ? "bg-emerald-600 text-white" : "bg-white text-emerald-700 border border-emerald-200";

  return (
    <div className="flex items-center gap-3 min-w-[220px]" dir="ltr">
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? "Pause" : "Play"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          btnBg,
          "hover:opacity-90 transition-opacity",
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ms-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div
          onClick={onTrackClick}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration ?? 0)}
          aria-valuenow={Math.floor(current)}
          aria-label="Audio progress"
          className={cn("relative h-1.5 cursor-pointer rounded-full", trackBg)}
        >
          <div
            className={cn("absolute top-0 start-0 h-full rounded-full", trackFill)}
            style={{ width: `${pct}%` }}
          />
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full shadow",
              trackFill,
            )}
            // Slight negative left offset so the thumb stays centered on
            // the progress edge instead of trailing it.
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500 font-mono">
          <span>{formatSeconds(current)}</span>
          <span>{duration ? formatSeconds(duration) : "—:—"}</span>
        </div>
        {hasError ? (
          <div className="mt-1 text-[10px] text-red-600">
            לא ניתן להפעיל את ההקלטה.
          </div>
        ) : null}
      </div>
    </div>
  );
}
