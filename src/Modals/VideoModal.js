import React, { useEffect, useRef } from "react";
import { Modal } from "antd";

const VideoModal = ({
  open,
  onClose,
  videoSrc,
  title = "Video Player",
  isInitializing,
  stopTracking,
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!open && videoRef.current) {
      // stop and reset video when modal closes
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [open]);

  const handleVideoEnd = () => {
    if (!isInitializing) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    stopTracking();
    onClose();
  };
  return (
    <Modal
      title={title}
      open={open}
      onCancel={() => {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
        onClose();
        stopTracking();
      }}
      footer={null}
      centered
      width={600}
      destroyOnClose={true} // ✅ Keep it mounted
      bodyStyle={{
        padding: 0,
        margin: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#000",
      }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        controls
        autoPlay
        onEnded={handleVideoEnd}
        preload="auto"
        style={{
          width: "100%",
          height: "auto",
          maxHeight: "80vh",
          borderRadius: 8,
          objectFit: "contain",
        }}
      />
    </Modal>
  );
};

export default VideoModal;
