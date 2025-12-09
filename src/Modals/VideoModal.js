import React, { useEffect, useRef } from "react";
import { Modal } from "antd";
import { GumletPlayer } from "@gumlet/react-embed-player";

const VideoModal = ({
  open,
  onClose,
  videoSrc,
  videoId,
  title = "Video Player",
  isInitializing,
  stopTracking,
}) => {
  const playerRef = useRef(null);

  useEffect(() => {
    console.log("video modal open", open);
    if (!open && playerRef.current) {
      // Pause video when modal closes
      try {
        if (playerRef.current.pause) {
          playerRef.current.pause();
        }
      } catch (error) {
        console.warn("Error pausing Gumlet player:", error);
      }
    }
  }, [open]);

  const handleVideoEnd = () => {
    if (!isInitializing) {
      try {
        if (playerRef.current && playerRef.current.pause) {
          playerRef.current.pause();
        }
      } catch (error) {
        console.warn("Error pausing Gumlet player:", error);
      }
    }
    stopTracking();
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        try {
          if (playerRef.current) {
            if (typeof playerRef.current.pause === "function") {
              playerRef.current.pause();
            } else if (playerRef.current.getPlayer && typeof playerRef.current.getPlayer().pause === "function") {
              playerRef.current.getPlayer().pause();
            }
          }
        } catch (error) {
          console.warn("Error pausing player:", error);
        }
        onClose();
        stopTracking();
      }}
      footer={null}
      centered
      width="90vw"
      style={{ maxWidth: "1200px" }}
      destroyOnClose={false}
      styles={{
        body: {
          padding: 0,
          margin: 0,
          background: "#000",
          overflow: "hidden",
        },
        content: {
          padding: 0,
          background: "#000",
        },
        header: {
          background: "#000",
          borderBottom: "none",
          padding: "16px 24px",
        },
        mask: {
          background: "rgba(0, 0, 0, 0.75)",
        },
        closeIcon: {
          color: "#fff",
        },
      }}
      closeIcon={
        <span style={{ color: "#fff", fontSize: "18px" }}>×</span>
      }
      maskStyle={{
        background: "rgba(0, 0, 0, 0.75)",
      }}
    >
      {videoId ? (
        <div
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            position: "relative",
            background: "#000",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#000",
              position: "relative",
            }}
          >
            <GumletPlayer
              ref={playerRef}
              videoID={videoId}
              autoplay={true}
              preload="auto"
              muted={false}
              start_high_res={true}
              controls={true}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 0,
                background: "#000",
              }}
              onEnded={handleVideoEnd}
              onPause={() => {
                // Optional: handle pause event
              }}
              onPlay={() => {
                // Optional: handle play event
              }}
            />
          </div>
        </div>
      ) : videoSrc ? (
        // Fallback to regular video element for local files or non-Gumlet URLs
        <div
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            position: "relative",
            background: "#000",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <video
            ref={playerRef}
            src={videoSrc}
            controls
            autoPlay
            onEnded={handleVideoEnd}
            preload="auto"
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 0,
              objectFit: "contain",
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            minHeight: "400px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            padding: "40px",
            background: "#000",
          }}
        >
          <p>No video source provided.</p>
        </div>
      )}
    </Modal>
  );
};

export default VideoModal;
