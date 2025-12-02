import React, { useState } from "react";
import { Modal, Spin } from "antd";
import YouTube from "react-youtube";

const YouTubeModal = ({
  open,
  onClose,
  videoId,
  title = "YouTube Player",
  onPlayStart,
  onPauseStop,
}) => {
  const [loading, setLoading] = useState(true);

  const handleCancel = () => {
    if (onPauseStop) onPauseStop();
    onClose();
    setLoading(true);
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCancel}
      footer={null}
      centered
      width={600}
      destroyOnHidden={false}
      styles={{
        body: {
          padding: 0,
          margin: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#000",
        },
      }}
    >
      <div style={{ width: "100%", position: "relative" }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "rgba(0,0,0,0.7)",
              zIndex: 10,
            }}
          >
            <Spin size="large" />
          </div>
        )}

        <YouTube
          videoId={videoId}
          opts={{
            width: "100%",
            height: "360",
            playerVars: {
              rel: 0,
              modestbranding: 1,
              controls: 1,
              autoplay: 0,
            },
          }}
          onReady={() => {
            setLoading(false);
          }}
          onPlay={() => {
            if (onPlayStart) onPlayStart();
          }}
          onPause={() => {
            if (onPauseStop) onPauseStop();
          }}
          onEnd={() => {
            if (onPauseStop) onPauseStop();
            onClose();
          }}
        />
      </div>
    </Modal>
  );
};

export default YouTubeModal;
