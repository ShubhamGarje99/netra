"use client";

import { VideoFeedCard } from "./VideoFeedCard";
import { CAMERA_FEEDS } from "@/lib/netra-constants";
import { Video } from "lucide-react";

export function VideoFeedPanel() {
  return (
    <div className="dashboard-panel flex flex-col h-full min-h-0">
      <div className="dashboard-panel-header flex items-center gap-2">
        <Video className="w-3 h-3" />
        <span>Video Feeds — AI Detection</span>
      </div>

      <div className="flex-1 grid grid-cols-2 auto-rows-fr gap-1 p-1 overflow-y-auto min-h-0" data-lenis-prevent>
        {CAMERA_FEEDS.map((feed) => (
          <VideoFeedCard
            key={feed.id}
            cameraId={feed.id}
            location={feed.location}
          />
        ))}
      </div>
    </div>
  );
}
